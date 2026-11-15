const ALARME = 'lead-finder-passo';
const ALARME_DIARIO = 'lead-finder-diario';
const HISTORICO_LIMITE = 20;
const PENDENTES_LIMITE = 50;
let sequencia = Promise.resolve();
const serial = (fn) => { const p = sequencia.then(fn); sequencia = p.catch(() => {}); return p; };
const ler = async () => (await chrome.storage.local.get('busca')).busca;
const salvar = (busca) => chrome.storage.local.set({ busca });
const lerLista = async (chave) => (await chrome.storage.local.get(chave))[chave] || [];
const gravarLista = (chave, valor) => chrome.storage.local.set({ [chave]: valor });
function painel(url) {
  try { const u = new URL(url); return u.origin === 'https://lcs021.github.io' && /^\/buscar-wpp\/(?:index\.html)?$/.test(u.pathname); } catch { return false; }
}
function maps(url) {
  try { const u = new URL(url); return u.protocol === 'https:' && ['www.google.com', 'www.google.com.br'].includes(u.hostname) && u.pathname.startsWith('/maps/'); } catch { return false; }
}
const agendar = () => chrome.alarms.create(ALARME, { when: Date.now() + 4000 });
function proximoHorario(hora) {
  const [h, m] = String(hora || '09:00').split(':').map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0); if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); return d.getTime();
}
async function configurarAlarme(config) {
  await chrome.alarms.clear(ALARME_DIARIO);
  if (config?.modo === 'diario' && config.tarefas?.length) {
    await chrome.alarms.create(ALARME_DIARIO, { when: proximoHorario(config.horario), periodInMinutes: 1440 });
  }
}
const resumo = (j) => j && ({ id: j.id, usuario: j.usuario, estado: j.estado, finalizada: j.finalizada,
  erro: j.erro, analisadas: j.analisadas, encontradas: j.resultados.length, resultados: j.resultados,
  termo: j.termo, form: j.form, descartadas: j.descartadas, total: j.urls.length, quantidade: j.quantidade,
  iniciada: j.iniciada, atualizada: j.atualizada, pausadaEm: j.pausadaEm, automatica: j.automatica });
async function arquivar(j) {
  if (!j) return;
  const pendentes = await lerLista('pendentes');
  if (!pendentes.some(x => x.id === j.id)) {
    pendentes.push({ ...j, resultados: [...j.resultados] });
    await gravarLista('pendentes', pendentes);
  }
  const historico = await lerLista('historico');
  const item = { id: j.id, usuario: j.usuario, estado: j.estado, termo: j.termo, form: j.form,
    analisadas: j.analisadas, encontradas: j.resultados.length, descartadas: j.descartadas,
    erro: j.erro, iniciada: j.iniciada, finalizadaEm: j.atualizada, automatica: j.automatica };
  await gravarLista('historico', [item, ...historico.filter(x => x.id !== j.id)].slice(0, HISTORICO_LIMITE));
}
async function terminar(j, estado = 'concluida', erro = '') {
  j.estado = estado; j.erro = erro; j.finalizada = true; j.atualizada = new Date().toISOString();
  await salvar(j); await arquivar(j); await chrome.alarms.clear(ALARME);
}
function validarUsuario(usuario) { return /^[0-9a-f-]{36}$/i.test(usuario || ''); }
function prepararTarefas(d) {
  const lista = (v) => {
    const itens = String(v || '').split(/[\n;]+/).map(x => x.trim()).filter(Boolean);
    if (itens.length > 40) throw Error('Use no máximo 40 ramos e 40 cidades por agendamento.');
    return itens;
  };
  const ramos = lista(d.ramos), cidadesTexto = lista(d.cidades), cidades = cidadesTexto.map(x => {
    const p = x.split(/[,|]/).map(y => y.trim());
    return { cidade: p[0], uf: (p[1] || '').toUpperCase() };
  });
  if (ramos.some(x => x.length < 2)) throw Error('Cada ramo precisa ter pelo menos 2 caracteres.');
  if (cidades.some(x => x.cidade.length < 2 || !/^[A-Z]{2}$/.test(x.uf))) throw Error('Revise as cidades: use Cidade, UF (por exemplo, Niterói, RJ).');
  return ramos.flatMap(tipo => cidades.map(c => ({ tipo, cidade: c.cidade, uf: c.uf, bairro: '' })));
}
async function iniciarBusca(d, automatica = false) {
  if (!validarUsuario(d.usuario)) throw Error('Entre no painel para pesquisar.');
  const anterior = await ler();
  if (anterior && !anterior.finalizada) throw Error('Já existe uma pesquisa em andamento. Pause ou cancele a pesquisa atual antes de iniciar outra.');
  const pendentes = await lerLista('pendentes');
  const finalAtualPendente = anterior?.finalizada && !pendentes.some(x => x.id === anterior.id) ? 1 : 0;
  if (pendentes.length + finalAtualPendente + 1 > PENDENTES_LIMITE) throw Error('Abra o painel e importe os resultados pendentes antes de iniciar novas buscas.');
  if (anterior?.finalizada) { await arquivar(anterior); await chrome.storage.local.remove('busca'); }
  const texto = (x) => typeof x === 'string' ? x.trim().slice(0, 120) : '';
  const tipo = texto(d.tipo), cidade = texto(d.cidade), uf = texto(d.uf), bairro = texto(d.bairro);
  if (tipo.length < 2 || cidade.length < 2 || !/^[A-Z]{2}$/.test(uf)) throw Error('Preencha ramo, cidade e estado.');
  const termo = [tipo, bairro, cidade, uf].filter(Boolean).join(' ');
  const aba = await chrome.tabs.create({ url: `https://www.google.com/maps/search/${encodeURIComponent(termo)}/?hl=pt-BR`, active: true });
  const now = new Date().toISOString();
  const job = { id: crypto.randomUUID(), usuario: d.usuario, termo, aba: aba.id, estado: 'listando',
    form: { tipo, cidade, uf, bairro }, finalizada: false, resultados: [], urls: [], indice: 0, analisadas: 0, descartadas: 0,
    rodadas: 0, estavel: 0, tentativas: 0, quantidade: Math.max(1, Math.min(60, Number(d.quantidade) || 20)),
    nota: Math.max(0, Math.min(5, Number(d.nota_minima) || 0)), avaliacoes: Math.max(0, Number(d.avaliacoes_minimas) || 0),
    iniciada: now, atualizada: now, automatica, cursorTarefa: d.cursorTarefa };
  await salvar(job); await agendar(); return resumo(job);
}
async function iniciarDaConfiguracao(usuario, motivo) {
  if (!validarUsuario(usuario)) return null;
  const config = (await chrome.storage.local.get('automacao')).automacao;
  if (!config || config.usuario !== usuario || config.modo === 'manual' || !config.tarefas?.length) return null;
  if (motivo === 'abertura' && config.modo !== 'abrir') return null;
  const now = Date.now();
  if (motivo === 'abertura' && now - Number(config.ultimaAbertura || 0) < 10 * 60 * 1000) return resumo(await ler());
  const atual = await ler();
  if (atual && !atual.finalizada) return resumo(atual);
  const cursor = Number(config.cursor || 0) % config.tarefas.length;
  const tarefa = config.tarefas[cursor];
  const job = await iniciarBusca({ ...tarefa, usuario, quantidade: config.quantidade, nota_minima: config.nota_minima,
    avaliacoes_minimas: config.avaliacoes_minimas, cursorTarefa: cursor }, true);
  if (motivo === 'abertura') config.ultimaAbertura = now;
  config.cursor = (cursor + 1) % config.tarefas.length; delete config.erro; delete config.erroEm;
  await chrome.storage.local.set({ automacao: config });
  return job;
}

chrome.runtime.onMessage.addListener((m, sender, responder) => {
  if (!painel(sender.tab?.url)) return;
  serial(async () => {
    if (m.acao === 'PING') return { versao: chrome.runtime.getManifest().version };
    const d = m.dados || {};
    if (!validarUsuario(d.usuario)) throw Error('Entre no painel para pesquisar.');
    if (m.acao === 'START') return iniciarBusca(d, false);
    const anterior = await ler();
    if (m.acao === 'SET_AUTOMACAO') {
      const tarefas = prepararTarefas(d);
      if (d.modo !== 'manual' && !tarefas.length) throw Error('Informe ao menos um ramo e uma cidade no formato Cidade, UF.');
      const config = { usuario: d.usuario, modo: ['manual', 'abrir', 'diario'].includes(d.modo) ? d.modo : 'manual',
        tarefas, quantidade: Math.max(1, Math.min(60, Number(d.quantidade) || 20)), horario: /^([01]\d|2[0-3]):[0-5]\d$/.test(d.horario) ? d.horario : '09:00',
        nota_minima: Math.max(0, Math.min(5, Number(d.nota_minima) || 0)), avaliacoes_minimas: Math.max(0, Number(d.avaliacoes_minimas) || 0), cursor: 0 };
      await chrome.storage.local.set({ automacao: config }); await configurarAlarme(config); return { modo: config.modo, tarefas: tarefas.length, quantidade: config.quantidade, horario: config.horario };
    }
    if (m.acao === 'GET_AUTOMACAO') {
      const config = (await chrome.storage.local.get('automacao')).automacao;
      return config?.usuario === d.usuario ? { modo: config.modo, tarefas: config.tarefas, quantidade: config.quantidade, horario: config.horario,
        erro: config.erro || '', erroEm: config.erroEm || '' } : null;
    }
    if (m.acao === 'UPDATE_FILTROS') {
      const config = (await chrome.storage.local.get('automacao')).automacao;
      if (config?.usuario !== d.usuario) return null;
      config.nota_minima = Math.max(0, Math.min(5, Number(d.nota_minima) || 0));
      config.avaliacoes_minimas = Math.max(0, Number(d.avaliacoes_minimas) || 0);
      await chrome.storage.local.set({ automacao: config }); return { ok: true };
    }
    if (m.acao === 'AUTO_START') return iniciarDaConfiguracao(d.usuario, 'abertura');
    if (m.acao === 'PENDENTES') return (await lerLista('pendentes')).filter(x => x.usuario === d.usuario).map(resumo);
    if (m.acao === 'HISTORICO') return (await lerLista('historico')).filter(x => x.usuario === d.usuario).slice(0, 20);
    if (m.acao === 'ACK_PENDENTE') {
      await gravarLista('pendentes', (await lerLista('pendentes')).filter(x => x.id !== d.id || x.usuario !== d.usuario));
      if (anterior?.id === d.id && anterior.usuario === d.usuario && anterior.finalizada) await chrome.storage.local.remove('busca');
      return { ok: true };
    }
    if (!anterior || anterior.usuario !== d.usuario) return null;
    if (m.acao === 'STATUS') return resumo(anterior);
    if (m.acao === 'PAUSE' && !anterior.finalizada && anterior.estado !== 'pausada') {
      anterior.estadoAnterior = anterior.estado; anterior.estado = 'pausada'; anterior.pausadaEm = new Date().toISOString();
      anterior.atualizada = anterior.pausadaEm; await salvar(anterior); await chrome.alarms.clear(ALARME); return resumo(anterior);
    }
    if (m.acao === 'RESUME' && !anterior.finalizada && anterior.estado === 'pausada') {
      anterior.estado = anterior.estadoAnterior || 'lendo'; delete anterior.estadoAnterior; delete anterior.pausadaEm;
      anterior.atualizada = new Date().toISOString(); await salvar(anterior); await agendar(); return resumo(anterior);
    }
    if (m.acao === 'CANCEL' && !anterior.finalizada) { await terminar(anterior, 'cancelada'); return resumo(anterior); }
    if (m.acao === 'ACK' && anterior.id === d.id && anterior.finalizada) {
      await chrome.storage.local.remove('busca');
      await gravarLista('pendentes', (await lerLista('pendentes')).filter(x => x.id !== d.id));
      return { ok: true };
    }
    return null;
  }).then((dados) => responder({ dados }), (e) => responder({ erro: e.message }));
  return true;
});

async function proxima(j) {
  j.tentativas = 0;
  if (j.indice >= j.urls.length || j.analisadas >= 60 || j.resultados.length >= j.quantidade) return terminar(j);
  j.estado = 'lendo'; j.atualizada = new Date().toISOString();
  j.urlAtual = j.urls[j.indice++]; await salvar(j);
  await chrome.tabs.update(j.aba, { url: j.urlAtual }); await agendar();
}
async function passo() {
  const j = await ler();
  if (!j || j.finalizada || j.estado === 'pausada') return;
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
      j.atualizada = new Date().toISOString(); await salvar(j); await agendar(); return;
    }
    j.tentativas = 0;
    if (j.estado === 'listando') {
      if (r.empresa) { j.urls = [r.empresa.maps_url]; j.estado = 'lendo'; j.indice = 1; j.urlAtual = r.empresa.maps_url; await salvar(j); await agendar(); return; }
      const antes = j.urls.length;
      j.urls = [...new Set([...j.urls, ...(r.links || []).filter(maps)])].slice(0, 60);
      j.estavel = j.urls.length === antes ? j.estavel + 1 : 0; j.rodadas++;
      if (r.fim || j.urls.length >= 60 || j.estavel >= 3 || j.rodadas >= 16) return proxima(j);
      await salvar(j); await agendar(); return;
    }
    const e = r.empresa;
    if (!e) return terminar(j, 'erro', 'A ficha da empresa não pôde ser identificada. Nenhuma ausência de site foi presumida.');
    j.analisadas++;
    const apta = e.nome && e.telefone && !e.temSite && !e.temAgenda && !e.fechada
      && Number.isFinite(e.nota) && Number.isFinite(e.avaliacoes) && e.nota >= j.nota && e.avaliacoes >= j.avaliacoes;
    if (apta && !j.resultados.some(x => x.maps_url === e.maps_url || (x.nome === e.nome && x.telefone === e.telefone))) j.resultados.push(e);
    else j.descartadas++;
    j.atualizada = new Date().toISOString(); await proxima(j);
  } catch (e) { await terminar(j, 'erro', `Pesquisa interrompida: ${e.message}`); }
}
chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARME) serial(passo);
  if (a.name === ALARME_DIARIO) serial(async () => {
    const c = (await chrome.storage.local.get('automacao')).automacao;
    if (c?.modo !== 'diario') return;
    try { await iniciarDaConfiguracao(c.usuario, 'diario'); }
    catch (e) { c.erro = e.message; c.erroEm = new Date().toISOString(); await chrome.storage.local.set({ automacao: c }); }
  });
});
chrome.tabs.onRemoved.addListener((id) => serial(async () => {
  const j = await ler(); if (j && !j.finalizada && j.aba === id) await terminar(j, 'cancelada', 'A aba de pesquisa foi fechada.');
}));
chrome.runtime.onStartup.addListener(() => serial(async () => {
  const j = await ler(); if (j && !j.finalizada && j.estado !== 'pausada') await terminar(j, 'erro', 'O navegador foi reiniciado. Inicie outra pesquisa para continuar.');
  await configurarAlarme((await chrome.storage.local.get('automacao')).automacao);
}));
