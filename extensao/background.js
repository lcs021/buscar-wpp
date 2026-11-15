const ALARME = 'lead-finder-passo';
let sequencia = Promise.resolve();
const serial = (fn) => { const p = sequencia.then(fn); sequencia = p.catch(() => {}); return p; };
const ler = async () => (await chrome.storage.local.get('busca')).busca;
const salvar = (busca) => chrome.storage.local.set({ busca });
function painel(url) {
  try { const u = new URL(url); return u.origin === 'https://lcs021.github.io' && /^\/buscar-wpp\/(?:index\.html)?$/.test(u.pathname); } catch { return false; }
}
function maps(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && ['www.google.com', 'www.google.com.br'].includes(u.hostname) && u.pathname.startsWith('/maps/'); } catch { return false; }
}
const agendar = () => chrome.alarms.create(ALARME, { when: Date.now() + 4000 });
async function terminar(j, estado = 'concluida', erro = '') {
  j.estado = estado; j.erro = erro; j.finalizada = true;
  await salvar(j); await chrome.alarms.clear(ALARME);
}
const resumo = (j) => j && ({ id: j.id, usuario: j.usuario, estado: j.estado, finalizada: j.finalizada,
  erro: j.erro, analisadas: j.analisadas, encontradas: j.resultados.length, resultados: j.resultados,
  termo: j.termo, form: j.form, descartadas: j.descartadas, total: j.urls.length });

chrome.runtime.onMessage.addListener((m, sender, responder) => {
  if (!painel(sender.tab?.url)) return;
  serial(async () => {
    if (m.acao === 'PING') return { versao: chrome.runtime.getManifest().version };
    const d = m.dados || {};
    if (!/^[0-9a-f-]{36}$/i.test(d.usuario || '')) throw Error('Entre no painel para pesquisar.');
    const anterior = await ler();
    if (m.acao === 'START') {
      if (anterior && !anterior.finalizada) throw Error('Já existe uma pesquisa em andamento. Pare a pesquisa atual antes de iniciar outra.');
      const texto = (x) => typeof x === 'string' ? x.trim().slice(0, 120) : '';
      const tipo = texto(d.tipo), cidade = texto(d.cidade), uf = texto(d.uf), bairro = texto(d.bairro);
      if (tipo.length < 2 || cidade.length < 2 || !/^[A-Z]{2}$/.test(uf)) throw Error('Preencha ramo, cidade e estado.');
      const termo = [tipo, bairro, cidade, uf].filter(Boolean).join(' ');
      const aba = await chrome.tabs.create({ url: `https://www.google.com/maps/search/${encodeURIComponent(termo)}/?hl=pt-BR`, active: true });
      const job = { id: crypto.randomUUID(), usuario: d.usuario, termo, aba: aba.id, estado: 'listando',
        form: {tipo, cidade, uf, bairro}, finalizada: false, resultados: [], urls: [], indice: 0, analisadas: 0, descartadas: 0,
        rodadas: 0, estavel: 0, tentativas: 0, quantidade: Math.max(1, Math.min(60, Number(d.quantidade) || 20)),
        nota: Math.max(0, Math.min(5, Number(d.nota_minima) || 0)), avaliacoes: Math.max(0, Number(d.avaliacoes_minimas) || 0) };
      await salvar(job); await agendar(); return resumo(job);
    }
    if (!anterior || anterior.usuario !== d.usuario) return null;
    if (m.acao === 'STATUS') return resumo(anterior);
    if (m.acao === 'CANCEL') { await terminar(anterior, 'cancelada'); return resumo(anterior); }
    if (m.acao === 'ACK' && anterior.id === d.id && anterior.finalizada) { await chrome.storage.local.remove('busca'); return { ok: true }; }
    return null;
  }).then((dados) => responder({ dados }), (e) => responder({ erro: e.message }));
  return true;
});

async function proxima(j) {
  j.tentativas = 0;
  if (j.indice >= j.urls.length || j.analisadas >= 60 || j.resultados.length >= j.quantidade) return terminar(j);
  j.estado = 'lendo';
  j.urlAtual = j.urls[j.indice++];
  await salvar(j);
  await chrome.tabs.update(j.aba, { url: j.urlAtual });
  await agendar();
}
async function passo() {
  const j = await ler();
  if (!j || j.finalizada) return;
  try {
    const tab = await chrome.tabs.get(j.aba);
    if (!maps(tab.url)) return terminar(j, 'erro', 'A aba saiu do Google Maps. Se apareceu consentimento ou verificação, resolva no navegador e inicie uma nova busca.');
    if (tab.status !== 'complete') { await agendar(); return; }
    let r;
    try { r = await chrome.tabs.sendMessage(j.aba, { acao: j.estado === 'listando' ? 'COLETAR' : 'LER', esperado: j.estado === 'lendo' ? j.urlAtual : '' }); }
    catch { r = { aguardar: true }; }
    if (r?.bloqueio) return terminar(j, 'erro', r.bloqueio);
    if (!r || r.aguardar) {
      if (++j.tentativas >= 8) return terminar(j, 'erro', 'Não consegui ler essa tela do Maps. Confira a aba: pode haver consentimento, verificação ou mudança no formato da página.');
      await salvar(j); await agendar(); return;
    }
    j.tentativas = 0;
    if (j.estado === 'listando') {
      if (r.empresa) {
        j.urls = [r.empresa.maps_url];
        j.estado = 'lendo'; j.indice = 1; j.urlAtual = r.empresa.maps_url;
        await salvar(j); await agendar(); return;
      }
      const antes = j.urls.length;
      j.urls = [...new Set([...j.urls, ...(r.links || []).filter(maps)])].slice(0, 60);
      j.estavel = j.urls.length === antes ? j.estavel + 1 : 0;
      j.rodadas++;
      if (r.fim || j.urls.length >= 60 || j.estavel >= 3 || j.rodadas >= 16) return proxima(j);
      await salvar(j); await agendar(); return;
    }
    const e = r.empresa;
    if (!e) return terminar(j, 'erro', 'A ficha da empresa não pôde ser identificada. Nenhuma ausência de site foi presumida.');
    j.analisadas++;
    // Sem nota/avaliações ou telefone: não inventar dados nem relaxar os filtros.
    const apta = e.nome && e.telefone && !e.temSite && !e.temAgenda && !e.fechada
      && Number.isFinite(e.nota) && Number.isFinite(e.avaliacoes)
      && e.nota >= j.nota && e.avaliacoes >= j.avaliacoes;
    if (apta && !j.resultados.some(x => x.maps_url === e.maps_url || (x.nome === e.nome && x.telefone === e.telefone))) j.resultados.push(e);
    else j.descartadas++;
    await proxima(j);
  } catch (e) { await terminar(j, 'erro', `Pesquisa interrompida: ${e.message}`); }
}
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARME) serial(passo); });
chrome.tabs.onRemoved.addListener((id) => serial(async () => {
  const j = await ler(); if (j && !j.finalizada && j.aba === id) await terminar(j, 'cancelada', 'A aba de pesquisa foi fechada.');
}));
chrome.runtime.onStartup.addListener(() => serial(async () => {
  const j = await ler(); if (j && !j.finalizada) await terminar(j, 'erro', 'O navegador foi reiniciado. Inicie outra pesquisa para continuar.');
}));
