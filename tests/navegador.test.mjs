import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { prepararCandidatos } from '../web/navegador.js';

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

async function worker() {
  let saved, msg, alarm, removed, startup;
  let respostaMaps;
  const updates = [], alarms = [];
  const context = vm.createContext({ crypto:globalThis.crypto, URL, Date, console,
    chrome: {
      storage:{local:{get:async()=>({busca:saved}),set:async d=>{saved=structuredClone(d.busca)},remove:async()=>{saved=undefined}}},
      runtime:{getManifest:()=>({version:'1.0.0'}),onMessage:{addListener:fn=>msg=fn},onStartup:{addListener:fn=>startup=fn}},
      alarms:{create:async(n,d)=>alarms.push([n,d]),clear:async()=>true,onAlarm:{addListener:fn=>alarm=fn}},
      tabs:{create:async d=>{updates.push(d);return {id:5}},update:async(id,d)=>updates.push(d),get:async()=>({url:'https://www.google.com/maps/search/teste/',status:'complete'}),
        sendMessage:async()=>respostaMaps,onRemoved:{addListener:fn=>removed=fn}}
    }
  });
  vm.runInContext(await readFile(new URL('../extensao/background.js',import.meta.url),'utf8'),context);
  const flush = () => vm.runInContext('serial(async()=>{})',context);
  return {
    saved:()=>saved, updates, alarms,
    message:(m,url='https://lcs021.github.io/buscar-wpp/')=>new Promise(resolve=>{
      const handled=msg(m,{tab:{url}},resolve);if(!handled)resolve(null);
    }),
    step:async(r)=>{respostaMaps=r;alarm({name:'lead-finder-passo'});await flush()},
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
test('manifesto não solicita cookies, histórico, acesso amplo ou código remoto',async()=>{
  const m=JSON.parse(await readFile(new URL('../extensao/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(m.permissions,['storage','alarms']);
  assert.ok(!JSON.stringify(m).includes('<all_urls>'));
  assert.equal(m.manifest_version,3);
});
