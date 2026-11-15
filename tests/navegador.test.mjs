import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepararCandidatos, progressoBusca } from '../web/navegador.js';

const perfil = { nota_minima:4.5, avaliacoes_minimas:20 };
const form = { tipo:'barbearias', cidade:'Nova Iguaçu', uf:'RJ', bairro:'' };
const empresa = (extra = {}) => ({ nome:'Barbearia Teste', telefone:'+5521999991234', nota:4.8, avaliacoes:42,
  categoria:'Barbearia', endereco:'Rua de teste, 10', temSite:false, temAgenda:false, fechada:false,
  maps_url:'https://www.google.com/maps/place/Barbearia+Teste/', ...extra });

test('importa apenas candidatas verificáveis, mantém fora da fila até revisão e não inventa dados', () => {
  const r = prepararCandidatos([empresa(), empresa(), empresa({temSite:true}), empresa({temAgenda:true}),
    empresa({nota:null}), empresa({avaliacoes:null}), empresa({telefone:''}), empresa({maps_url:'https://outro.com/maps/'}),
    empresa({fechada:true}), empresa({nota:4}), empresa({temSite:undefined})], perfil, form);
  assert.equal(r.length, 1);
  assert.equal(r[0].qualificado, false);
  assert.equal(r[0].telefone, '21999991234');
  assert.equal(r[0].nota, 4.8);
  assert.equal(r[0].avaliacoes, 42);
  assert.equal(r[0].cidade, 'Nova Iguaçu');
  assert.match(r[0].motivo, /Conferência pendente/);
  assert.match(r[0].busca_termo, /^navegador:/);
  assert.ok(!('mensagem' in r[0]) && !('demo_publicada' in r[0]));
});
test('não recadastra empresa já existente, mesmo com formatação diferente no telefone', () => {
  const descartada = {nome:'BARBEARIA TESTE',telefone:'(21) 99999-1234',status:'descartado'};
  assert.equal(prepararCandidatos([empresa()],perfil,form,[descartada]).length,0);
});
test('progresso acompanha fases da busca e só chega a 100% quando ela termina', () => {
  assert.equal(progressoBusca({estado:'listando',total:30}),25);
  assert.ok(progressoBusca({estado:'lendo',analisadas:20,total:60,quantidade:20,encontradas:0}) < 100);
  assert.equal(progressoBusca({estado:'concluida',finalizada:true,analisadas:20,total:60}),100);
});

async function worker() {
  const storage = {}; let msg, alarm, removed, startup;
  let respostaMaps;
  const updates = [], alarms = [];
  const context = vm.createContext({ crypto:globalThis.crypto, URL, Date, console,
    chrome: {
      storage:{local:{get:async k=>({[k]:storage[k]}),set:async d=>Object.assign(storage,structuredClone(d)),remove:async k=>{delete storage[k]}}},
      runtime:{getManifest:()=>({version:'1.1.0'}),onMessage:{addListener:fn=>msg=fn},onStartup:{addListener:fn=>startup=fn}},
      alarms:{create:async(n,d)=>alarms.push([n,d]),clear:async()=>true,onAlarm:{addListener:fn=>alarm=fn}},
      tabs:{create:async d=>{updates.push(d);return {id:5}},update:async(id,d)=>updates.push(d),get:async()=>({url:'https://www.google.com/maps/search/teste/',status:'complete'}),
        sendMessage:async()=>respostaMaps,onRemoved:{addListener:fn=>removed=fn}}
    }
  });
  vm.runInContext(await readFile(new URL('../extensao/background.js',import.meta.url),'utf8'),context);
  const flush = () => vm.runInContext('serial(async()=>{})',context);
  return {
    saved:()=>storage.busca, storage, updates, alarms,
    message:(m,url='https://lcs021.github.io/buscar-wpp/')=>new Promise(resolve=>{
      const handled=msg(m,{tab:{url}},resolve);if(!handled)resolve(null);
    }),
    step:async(r)=>{respostaMaps=r;alarm({name:'lead-finder-passo'});await flush()},
    daily:async()=>{alarm({name:'lead-finder-diario'});await flush()},
    close:async()=>{removed(5);await flush()},
    startup:async()=>{startup();await flush()}
  };
}
const usuario='66f2d4ee-e33f-489f-af5c-0ed006c52573';
const start={acao:'START',dados:{...form,usuario,quantidade:10,nota_minima:4.5,avaliacoes_minimas:20}};

test('extensão abre Maps, processa sequencialmente, filtra sites e não recebe tokens',async()=>{
  const w=await worker();
  const inicio=await w.message(start);
  assert.equal(inicio.dados.estado,'listando');
  assert.ok(w.updates[0].url.startsWith('https://www.google.com/maps/search/'));
  await w.step({links:['https://www.google.com/maps/place/A/','https://www.google.com/maps/place/B/','https://malicioso.com/'],fim:true});
  assert.equal(w.saved().urls.length,2);
  await w.step({empresa:empresa({maps_url:'https://www.google.com/maps/place/A/',temSite:true})});
  await w.step({empresa:empresa({maps_url:'https://www.google.com/maps/place/B/'})});
  const fim=await w.message({acao:'STATUS',dados:{usuario}});
  assert.equal(fim.dados.finalizada,true);
  assert.equal(fim.dados.analisadas,2);
  assert.equal(fim.dados.encontradas,1);
  assert.ok(!JSON.stringify(w.saved()).includes('access_token'));
  await w.message({acao:'ACK',dados:{usuario,id:fim.dados.id}});
  assert.equal(w.saved(),undefined);
});
test('rejeita chamadas de outros sites e isola os resultados por usuário',async()=>{
  const w=await worker();
  assert.equal(await w.message(start,'https://malicioso.com/'),null);
  assert.equal(await w.message(start,'https://lcs021.github.io/outro/'),null);
  await w.message(start);
  assert.equal((await w.message({acao:'STATUS',dados:{usuario:'11111111-1111-1111-1111-111111111111'}})).dados,null);
  assert.match((await w.message(start)).erro,/andamento/);
});
test('verificação do Google interrompe; cancelamento e reinício preservam as candidatas',async()=>{
  const w=await worker();await w.message(start);
  await w.step({bloqueio:'O Google pediu verificação.'});
  assert.equal(w.saved().estado,'erro');assert.equal(w.saved().finalizada,true);
  await w.message(start);await w.close();assert.equal(w.saved().estado,'cancelada');
  await w.message(start);await w.startup();assert.equal(w.saved().estado,'erro');
});

test('pausa suspende os passos e retomar continua do ponto salvo',async()=>{
  const w=await worker();await w.message(start);
  const pausada=await w.message({acao:'PAUSE',dados:{usuario}});
  assert.equal(pausada.dados.estado,'pausada');
  const antes=w.saved().rodadas;
  await w.step({links:['https://www.google.com/maps/place/A/'],fim:true});
  assert.equal(w.saved().estado,'pausada');assert.equal(w.saved().rodadas,antes);
  const retomada=await w.message({acao:'RESUME',dados:{usuario}});
  assert.equal(retomada.dados.estado,'listando');
  await w.step({links:['https://www.google.com/maps/place/A/'],fim:true});
  assert.equal(w.saved().estado,'lendo');
});

test('pausa permanece pausada após reiniciar o navegador',async()=>{
  const w=await worker();await w.message(start);await w.message({acao:'PAUSE',dados:{usuario}});
  await w.startup();
  assert.equal(w.saved().estado,'pausada');assert.equal(w.saved().finalizada,false);
});

test('modo ao abrir inicia uma combinação uma vez e evita duplicar recargas próximas',async()=>{
  const w=await worker();
  await w.message({acao:'SET_AUTOMACAO',dados:{usuario,modo:'abrir',ramos:'Barbearias',cidades:'Niterói, RJ',quantidade:10}});
  const primeiro=await w.message({acao:'AUTO_START',dados:{usuario}});
  const segundo=await w.message({acao:'AUTO_START',dados:{usuario}});
  assert.equal(primeiro.dados.estado,'listando');assert.equal(segundo.dados.id,primeiro.dados.id);
  assert.equal(w.updates.filter(x=>x.url?.startsWith('https://www.google.com/maps/search/')).length,1);
});

test('agendamento diário percorre combinações e mantém histórico e pendentes isolados por usuário',async()=>{
  const w=await worker();
  const cfg=await w.message({acao:'SET_AUTOMACAO',dados:{usuario,modo:'diario',ramos:'Barbearias\nPet shops',cidades:'Nova Iguaçu, RJ\nNiterói, RJ',quantidade:10,horario:'09:00'}});
  assert.equal(cfg.dados.tarefas,4);
  assert.ok(w.alarms.some(([n])=>n==='lead-finder-diario'));
  await w.message({acao:'UPDATE_FILTROS',dados:{usuario,nota_minima:4.7,avaliacoes_minimas:55}});
  await w.daily();
  assert.equal(w.saved().form.cidade,'Nova Iguaçu');
  assert.equal(w.saved().nota,4.7);assert.equal(w.saved().avaliacoes,55);
  await w.step({bloqueio:'O Google pediu verificação.'});
  const pendentes=await w.message({acao:'PENDENTES',dados:{usuario}});
  assert.equal(pendentes.dados.length,1);assert.equal(pendentes.dados[0].estado,'erro');
  const outro=await w.message({acao:'HISTORICO',dados:{usuario:'11111111-1111-1111-1111-111111111111'}});
  assert.equal(outro.dados.length,0);
  const historico=await w.message({acao:'HISTORICO',dados:{usuario}});
  assert.equal(historico.dados[0].erro,'O Google pediu verificação.');
  await w.message({acao:'ACK_PENDENTE',dados:{usuario,id:pendentes.dados[0].id}});
  assert.equal((await w.message({acao:'PENDENTES',dados:{usuario}})).dados.length,0);
});

test('falha por pendentes preserva o cursor e exibe erro até a próxima tentativa',async()=>{
  const w=await worker();
  await w.message({acao:'SET_AUTOMACAO',dados:{usuario,modo:'diario',ramos:'Barbearias\nPet shops',cidades:'Niterói, RJ',quantidade:10}});
  w.storage.pendentes=Array.from({length:50},(_,i)=>({id:`pendente-${i}`,usuario}));
  await w.daily();
  assert.equal(w.storage.automacao.cursor,0);
  assert.match(w.storage.automacao.erro,/resultados pendentes/);
  w.storage.pendentes.pop();
  await w.daily();
  assert.equal(w.saved().form.tipo,'Barbearias');
  assert.equal(w.storage.automacao.cursor,1);
  assert.equal(w.storage.automacao.erro,undefined);
});
test('manifesto não solicita cookies, histórico, acesso amplo ou código remoto',async()=>{
  const m=JSON.parse(await readFile(new URL('../extensao/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(m.permissions,['storage','alarms']);
  assert.ok(!JSON.stringify(m).includes('<all_urls>'));
  assert.equal(m.manifest_version,3);
  assert.equal(m.version,'1.1.0');
  const bridge=await readFile(new URL('../extensao/painel.js',import.meta.url),'utf8');
  for(const a of ['PAUSE','RESUME','SET_AUTOMACAO','AUTO_START','PENDENTES','HISTORICO','ACK_PENDENTE','UPDATE_FILTROS']) assert.ok(bridge.includes(`'${a}'`));
});

test('leitor aceita a URL canônica do Maps com coordenadas e lê a ficha sem presumir dados ausentes', async () => {
  let listener;
  const nota = {textContent:'4,8'};
  const aval = {getAttribute:()=> '42 avaliações'};
  const painel = {textContent:'Barbearia Teste',
    querySelector:(s)=>s.includes('aria-hidden')?nota:null,
    querySelectorAll:(s)=>s.includes('.F7nice')?[aval]:[]};
  const h1 = {textContent:'Barbearia Teste',closest:()=>painel};
  const telefone = {getAttribute:()=> 'phone:tel:+5521999991234'};
  const doc = {body:{textContent:'Barbearia Teste'},querySelector:(s)=>
    s.startsWith('h1')?h1:s.startsWith('button[data-item-id^="phone:')?telefone:s.includes('role="tablist"')?{}:null};
  const ctx=vm.createContext({URL,document:doc,location:{href:'https://www.google.com/maps/place/Barbearia+Teste/@-22,-43,17z/data=!1sabc'},
    chrome:{runtime:{onMessage:{addListener:fn=>listener=fn}}}});
  vm.runInContext(await readFile(new URL('../extensao/maps.js',import.meta.url),'utf8'),ctx);
  let r;
  listener({acao:'LER',esperado:'https://www.google.com/maps/place/Barbearia+Teste/data=!1sabc'},null,x=>r=x);
  assert.equal(r.empresa.nome,'Barbearia Teste');
  assert.equal(r.empresa.nota,4.8);
  assert.equal(r.empresa.avaliacoes,42);
  listener({acao:'LER',esperado:'https://www.google.com/maps/place/Outra/'},null,x=>r=x);
  assert.equal(r.aguardar,true);
});
