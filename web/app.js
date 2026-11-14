import * as sb from "./sb.js";
import { TEMAS, FALHAS, STATUS, esc, notaBR, milhar, digitos, numeroWhats, linkMaps, linkSite, mensagem, renderSite, nomeCurto, montarLead, lerCSV, ESTILOS, mensagemEstilo } from "./shared.js";
import { PLANOS_PADRAO, reais } from "./planos.js";
import { csvCell } from "./csv.js";
import { sanitizeLeadUrls } from "./url.js";

const $app = document.getElementById("app");
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const SUGESTOES = ["Barbearias", "Salões de beleza", "Oficinas mecânicas", "Estética automotiva", "Hamburguerias", "Pizzarias",
  "Açaí", "Pet shops", "Dentistas", "Padarias", "Restaurantes", "Lojas de roupas", "Academias", "Clínicas"];
const COR_FALHA = { sem_site: "v", instagram: "ro", facebook: "az", whatsapp: "v", link_agregador: "am", com_site: "c" };
const COR_STATUS = { novo: "c", enviado: "az", respondeu: "am", interessado: "v", fechado: "v", perdido: "vm", descartado: "c" };

const st = {
  pagina: (location.hash || "#dashboard").slice(1),
  perfil: { nome_vendedor: "", cidade_padrao: "", uf_padrao: "", nota_minima: 4.5, avaliacoes_minimas: 20, validade_dias: 7, condicoes: "Pagamento: 50% para começar e 50% na entrega (Pix ou cartão).", planos: PLANOS_PADRAO },
  leads: [], buscas: [], carregado: false,
  filtro: "qualificados", status: "", texto: "", nicho: "",
  aberto: null,           // id do lead na gaveta
  busca: null, buscando: false, erroBusca: "",
  form: { tipo: "", cidade: "", uf: "", bairro: "", quantidade: 20 },
  filaPos: 0, menu: false,
  estilo: {},             // estilo de mensagem escolhido por lead
  sel: new Set(),         // leads marcados para ação em massa
};

// ------------------------------------------------------------------ utilidades
let tToast;
function toast(msg, erro = false) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.className = "toast" + (erro ? " erro" : ""); t.hidden = false;
  clearTimeout(tToast); tToast = setTimeout(() => (t.hidden = true), erro ? 6000 : 2600);
}
const I = {
  busca: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  menu: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  zap: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>',
  olho: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
};
const quando = (iso) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora"; if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`; return new Date(iso).toLocaleDateString("pt-BR");
};
const leadPorId = (id) => st.leads.find((l) => l.id === id);
const msgAuto = (l) => mensagemEstilo(st.estilo[l.id] || "padrao", l, st.perfil, linkSite(l));
const msgDe = (l) => l.mensagem ?? msgAuto(l);
function chipsEstilo(l, alvo, tipos) {
  const atual = st.estilo[l.id] || (l.mensagem != null ? "" : "padrao");
  return `<div class="estilos"><span class="sub">Melhorar mensagem:</span>${ESTILOS.filter((e) => tipos.includes(e.tipo)).map((e) =>
    `<button type="button" class="chip${atual === e.id ? " on" : ""}" data-estilo="${e.id}" data-id="${l.id}" data-alvo="${alvo}">${e.rotulo}</button>`).join("")}</div>`;
}
const linkWhats = (l, texto) => `https://wa.me/${numeroWhats(l)}?text=${encodeURIComponent(texto)}`;
const filaLista = () => st.leads.filter((l) => l.qualificado && l.status === "novo" && numeroWhats(l))
  .sort((a, b) => (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0));

function seloFalha(l) { return `<span class="selo ${COR_FALHA[l.status_site] || "c"}">${esc(FALHAS[l.status_site] || l.status_site)}</span>`; }
function seloStatus(l) { return `<span class="selo ${COR_STATUS[l.status] || "c"}">${esc(STATUS[l.status] || l.status)}</span>`; }

// ------------------------------------------------------------------ dados
async function carregar() {
  const [perfis, leads, buscas] = await Promise.all([
    sb.db("perfis?select=*"),
    sb.db("leads?select=*&order=created_at.desc&limit=5000"),
    sb.db("buscas?select=*&order=created_at.desc&limit=8"),
  ]);
  if (perfis?.[0]) st.perfil = { ...st.perfil, ...perfis[0], planos: perfis[0].planos || st.perfil.planos };
  st.leads = leads || []; st.buscas = buscas || []; st.carregado = true;
  st.form.cidade ||= st.perfil.cidade_padrao; st.form.uf ||= st.perfil.uf_padrao;
}

async function atualizar(id, dados, msg) {
  try {
    const [novo] = await sb.db(`leads?id=eq.${id}`, { method: "PATCH", body: dados });
    const i = st.leads.findIndex((l) => l.id === id);
    if (i >= 0 && novo) st.leads[i] = novo;
    if (st.busca) st.busca.leads = st.busca.leads.map((l) => (l.id === id && novo ? novo : l));
    if (msg) toast(msg);
    render();
    return novo;
  } catch (e) { toast(e.message, true); }
}

// Enviar: abre o WhatsApp na hora (precisa ser direto no clique) e depois marca como enviado + publica a demo.
function enviarWhats(l, texto) {
  window.open(linkWhats(l, texto), "_blank", "noopener");
  const dados = { status: "enviado", enviado_em: new Date().toISOString(), demo_publicada: true };
  if (texto !== mensagemEstilo("padrao", l, st.perfil, linkSite(l))) dados.mensagem = texto;
  return atualizar(l.id, dados, "Marcado como enviado. Confira o envio no WhatsApp.");
}

// ------------------------------------------------------------------ telas
function telaLogin(erro = "") {
  if (!sb.configurado()) {
    $app.innerHTML = `<div class="login"><div class="card" style="max-width:520px"><h3>Falta configurar</h3>
      <p style="color:var(--t2)">Abra o arquivo <b>web/config.js</b> e cole a URL e a chave pública do seu projeto Supabase. O passo a passo está no README.</p></div></div>`;
    return;
  }
  $app.innerHTML = `<div class="login"><form id="f-login" class="card">
    <div class="marca"><span class="logo">${I.busca}</span><div>Lead Finder<small>prospecção local</small></div></div>
    ${erro ? `<div class="aviso erro">${esc(erro)}</div>` : ""}
    <div class="campo"><label>E-mail</label><input class="in" name="email" type="email" autocomplete="username" required></div>
    <div class="campo"><label>Senha</label><input class="in" name="senha" type="password" autocomplete="current-password" required></div>
    <button class="btn p g" type="submit">Entrar</button>
  </form></div>`;
  document.getElementById("f-login").onsubmit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    ev.target.querySelector("button").disabled = true;
    try { await sb.entrar(f.get("email"), f.get("senha")); await iniciar(); }
    catch (e) { telaLogin(e.message); }
  };
}

const PAGINAS = [
  ["dashboard", "Dashboard", "Visão geral da prospecção"],
  ["buscar", "Buscar empresas", "Pesquise no Google e veja quem não tem site"],
  ["adicionar", "Adicionar empresas", "Cadastre na mão ou importe uma planilha (não precisa da API do Google)"],
  ["fila", "Fila de envio", "Mande as mensagens uma a uma, em um clique"],
  ["leads", "Leads", "Todas as empresas encontradas"],
  ["config", "Configurações", "Seu nome, filtros e exportação"],
];

function render() {
  if (!sb.usuario()) return telaLogin();
  if (!st.carregado) { $app.innerHTML = '<div class="carregando">Carregando dados…</div>'; return; }
  const pag = PAGINAS.find((p) => p[0] === st.pagina) || PAGINAS[0];
  const cont = { fila: filaLista().length, leads: st.leads.filter((l) => l.qualificado).length };
  const scroll = document.querySelector(".gaveta")?.scrollTop;
  // guarda textos que você está digitando para não perder ao redesenhar a tela
  const rascunho = {};
  for (const idc of ["det-msg", "det-obs", "fila-msg"]) {
    const el = document.getElementById(idc);
    if (el && el.value !== el.defaultValue) rascunho[idc] = { valor: el.value, dono: el.dataset.dono };
  }
  $app.innerHTML = `<div class="app">
    <aside class="lateral${st.menu ? " aberta" : ""}">
      <div class="marca"><span class="logo">${I.busca}</span><div>Lead Finder<small>prospecção local</small></div></div>
      ${PAGINAS.map(([k, r]) => `<button class="nav${pag[0] === k ? " on" : ""}" data-ir="${k}">${r}${cont[k] ? `<span class="cont">${cont[k]}</span>` : ""}</button>`).join("")}
      <div class="rodape"><span>${esc(sb.usuario()?.email || "")}</span><button data-acao="sair">Sair</button></div>
    </aside>
    <main class="conteudo">
      <div class="topo"><button class="menu-mob" data-acao="menu" aria-label="Menu">${I.menu}</button>
        <div><h1>${pag[1]}</h1><p>${pag[2]}</p></div></div>
      ${({ dashboard: telaDashboard, buscar: telaBuscar, adicionar: telaAdicionar, fila: telaFila, leads: telaLeads, config: telaConfig })[pag[0]]()}
    </main>
  </div>${st.aberto ? telaGaveta() : ""}`;
  if (scroll) { const g = document.querySelector(".gaveta"); if (g) g.scrollTop = scroll; }
  for (const [idc, r] of Object.entries(rascunho)) {
    const el = document.getElementById(idc);
    if (el && el.dataset.dono === r.dono) el.value = r.valor;
  }
  montarPreviews();
}

function montarPreviews() {
  document.querySelectorAll("iframe[data-prev]").forEach((f) => {
    const l = leadPorId(f.dataset.prev) || st.busca?.leads.find((x) => x.id === f.dataset.prev);
    if (l) f.srcdoc = renderSite(l, { preview: true });
  });
}

function telaDashboard() {
  const L = st.leads;
  const k = {
    total: L.length, qual: L.filter((l) => l.qualificado).length,
    env: L.filter((l) => ["enviado", "respondeu", "interessado", "fechado", "perdido"].includes(l.status)).length,
    viu: L.filter((l) => l.visualizacoes > 0).length,
    int: L.filter((l) => ["interessado", "fechado"].includes(l.status)).length, fech: L.filter((l) => l.status === "fechado").length,
  };
  const quentes = L.filter((l) => l.visualizacoes > 0).sort((a, b) => new Date(b.ultima_visualizacao) - new Date(a.ultima_visualizacao)).slice(0, 8);
  const kp = (r, n, sub, dest) => `<div class="card kpi${dest ? " dest" : ""}"><span class="rot">${r}</span><span class="num">${n}</span>${sub ? `<span class="sub">${sub}</span>` : ""}</div>`;
  return `${!st.perfil.nome_vendedor ? `<div class="aviso">Coloque seu nome em <a href="#config">Configurações</a> para ele aparecer nas mensagens.</div>` : ""}
  <div class="kpis">
    ${kp("Empresas encontradas", k.total)}
    ${kp("Qualificadas", k.qual, "bons negócios sem site", true)}
    ${kp("Mensagens enviadas", k.env)}
    ${kp("Abriram o site demo", k.viu, k.env ? `${Math.round((k.viu / k.env) * 100)}% dos enviados` : "")}
    ${kp("Interessados", k.int)}
    ${kp("Negócios fechados", k.fech)}
  </div>
  <div class="duas">
    <div class="card"><h3>Abriram o site demo (chame agora!)</h3>
      ${quentes.length ? `<ul class="lista">${quentes.map((l) => `<li><a href="#" data-abrir="${l.id}">${esc(nomeCurto(l.nome))}</a>
        <span class="meta">${I.olho} ${l.visualizacoes}x · ${quando(l.ultima_visualizacao)}</span></li>`).join("")}</ul>`
        : `<div class="sub">Quando alguém abrir o link que você mandou, aparece aqui.</div>`}
    </div>
    <div class="card"><h3>Últimas buscas</h3>
      ${st.buscas.length ? `<ul class="lista">${st.buscas.map((b) => `<li><span>${esc(b.termo)}</span><span class="meta">${b.qualificados} qualif. · ${b.novos} novas · ${quando(b.created_at)}</span></li>`).join("")}</ul>`
        : `<div class="sub">Nenhuma busca ainda. <a href="#buscar">Fazer a primeira</a></div>`}
    </div>
  </div>`;
}

function telaBuscar() {
  const f = st.form;
  const r = st.busca;
  return `<form class="card" id="f-busca">
    <div class="form-busca">
      <div class="campo"><label>Tipo de empresa</label><input class="in" name="tipo" placeholder="Ex.: barbearias" value="${esc(f.tipo)}"></div>
      <div class="campo"><label>Cidade</label><input class="in" name="cidade" placeholder="Ex.: Nova Iguaçu" value="${esc(f.cidade)}"></div>
      <div class="campo"><label>Estado</label><select class="in" name="uf"><option value="">UF</option>${UFS.map((u) => `<option${u === f.uf ? " selected" : ""}>${u}</option>`).join("")}</select></div>
      <div class="campo"><label>Bairro (opcional)</label><input class="in" name="bairro" placeholder="Ex.: Centro" value="${esc(f.bairro)}"></div>
      <div class="campo"><label>Quantidade</label><select class="in" name="quantidade">${[10, 20, 40, 60].map((n) => `<option${n == f.quantidade ? " selected" : ""}>${n}</option>`).join("")}</select></div>
      <button class="btn p g" type="submit"${st.buscando ? " disabled" : ""}>${st.buscando ? '<span class="giro"></span> PESQUISANDO…' : `${I.busca} PESQUISAR EMPRESAS`}</button>
    </div>
    <div class="chips" style="margin-top:12px">${SUGESTOES.map((s) => `<button type="button" class="chip${f.tipo === s ? " on" : ""}" data-tipo="${esc(s)}">${esc(s)}</button>`).join("")}</div>
    <p class="sub" style="margin-top:12px">Filtro atual: nota ≥ ${notaBR(st.perfil.nota_minima)} e ≥ ${st.perfil.avaliacoes_minimas} avaliações, sem site próprio. Ajuste em Configurações.</p>
  </form>
  ${st.erroBusca ? `<div class="aviso erro" style="margin-top:14px">${esc(st.erroBusca)}${/GOOGLE_PLACES_API_KEY|Google recusou/.test(st.erroBusca) ? `<br>Sem a chave do Google, use <a href="#adicionar">Adicionar empresas</a>: cadastro manual ou importação de planilha.` : ""}</div>` : ""}
  ${r ? `<div style="margin-top:18px">
    <div class="ferr"><span><b>${r.total}</b> encontradas · <b>${r.qualificados}</b> qualificadas · <b>${r.novos}</b> novas</span><span class="esp"></span>
      ${r.qualificados ? `<a class="btn p" href="#fila">Ir para a fila de envio →</a>` : ""}</div>
    ${tabela(r.leads)}
  </div>` : ""}`;
}

function telaAdicionar() {
  const nichos = Object.entries(TEMAS).map(([k, t]) => `<option value="${k}">${t.rotulo}</option>`).join("");
  const r = st.importado;
  return `<div class="duas" style="align-items:start">
  <form class="card" id="f-manual"><h3>Cadastrar uma empresa</h3>
    <p class="sub" style="margin:-6px 0 12px">Achou no Google Maps, no Instagram ou passando na rua? Copie os dados aqui. Só nome e telefone são obrigatórios.</p>
    <div class="form-busca" style="grid-template-columns:1fr 1fr">
      <div class="campo" style="grid-column:1/-1"><label>Nome da empresa *</label><input class="in" name="nome" required></div>
      <div class="campo"><label>Telefone / WhatsApp *</label><input class="in" name="telefone" required placeholder="(21) 99999-9999"></div>
      <div class="campo"><label>Tipo</label><select class="in" name="nicho"><option value="">Detectar pelo nome</option>${nichos}</select></div>
      <div class="campo" style="grid-column:1/-1"><label>Endereço</label><input class="in" name="endereco" placeholder="Rua, número"></div>
      <div class="campo"><label>Bairro</label><input class="in" name="bairro"></div>
      <div class="campo"><label>Cidade</label><input class="in" name="cidade" value="${esc(st.perfil.cidade_padrao)}"></div>
      <div class="campo"><label>Nota no Google</label><input class="in" name="nota" inputmode="decimal" placeholder="Ex.: 4,8"></div>
      <div class="campo"><label>Nº de avaliações</label><input class="in" name="avaliacoes" inputmode="numeric" placeholder="Ex.: 120"></div>
      <div class="campo"><label>Situação do site</label><select class="in" name="status_site">${Object.entries(FALHAS).map(([k, r]) => `<option value="${k}">${r}</option>`).join("")}</select></div>
      <div class="campo"><label>Link (Instagram, cardápio…)</label><input class="in" name="link" placeholder="https://"></div>
      <div class="campo" style="grid-column:1/-1"><label>Link do Google Maps (opcional)</label><input class="in" name="maps_url" placeholder="https://maps.app.goo.gl/…"></div>
    </div>
    <div class="linha-btns" style="margin-top:12px"><button class="btn p" type="submit">Adicionar e ver o site demo</button></div>
  </form>
  <div class="card"><h3>Importar planilha</h3>
    <p class="sub" style="margin:-6px 0 12px">Aceita CSV com colunas como Empresa, Telefone, Endereço, Bairro, Nota, Avaliações e Status do site, inclusive a <b>captacao.csv</b> das 20 empresas de Nova Iguaçu e as exportações do Lead Finder. Empresas repetidas não duplicam.</p>
    <input type="file" id="arq-csv" accept=".csv,text/csv" class="in">
    ${r ? `<div class="aviso info" style="margin-top:12px">${r}</div>` : ""}
  </div></div>`;
}

async function gravarLeads(linhas) {
  const corpo = linhas.map((l) => ({ ...l, user_id: sb.usuario().id }));
  const salvos = await sb.db("leads?on_conflict=user_id,place_id", { method: "POST", body: corpo, prefer: "resolution=merge-duplicates,return=representation" });
  for (const l of salvos || []) { const i = st.leads.findIndex((x) => x.id === l.id); i >= 0 ? (st.leads[i] = l) : st.leads.unshift(l); }
  return salvos || [];
}

function filtrar(L) {
  const t = st.texto.trim().toLowerCase();
  return L.filter((l) => {
    if (st.filtro === "qualificados" && !l.qualificado) return false;
    if (st.filtro === "sem_site" && l.status_site !== "sem_site") return false;
    if (st.filtro === "redes" && !["instagram", "facebook", "whatsapp", "link_agregador"].includes(l.status_site)) return false;
    if (st.filtro === "whats" && !numeroWhats(l)) return false;
    if (st.filtro === "viram" && !(l.visualizacoes > 0)) return false;
    if (st.filtro === "favoritos" && !l.favorito) return false;
    if (st.status && l.status !== st.status) return false;
    if (st.nicho && l.nicho !== st.nicho) return false;
    if (t && !`${l.nome} ${l.categoria} ${l.bairro} ${l.endereco} ${l.observacoes}`.toLowerCase().includes(t)) return false;
    return true;
  });
}

function telaLeads() {
  const filtros = [["qualificados", "Qualificadas"], ["todos", "Todas"], ["sem_site", "Sem site"], ["redes", "Só redes/links"],
    ["whats", "Com WhatsApp"], ["viram", "Abriram a demo"], ["favoritos", "Favoritos"]];
  const lista = filtrar(st.leads);
  return `<div class="ferr">
    <div class="chips">${filtros.map(([k, r]) => `<button class="chip${st.filtro === k ? " on" : ""}" data-filtro="${k}">${r}</button>`).join("")}</div>
    <span class="esp"></span>
    <select class="in" style="max-width:170px" id="sel-status"><option value="">Todos os status</option>${Object.entries(STATUS).map(([k, r]) => `<option value="${k}"${st.status === k ? " selected" : ""}>${r}</option>`).join("")}</select>
    <select class="in" style="max-width:170px" id="sel-nicho"><option value="">Todos os nichos</option>${Object.entries(TEMAS).map(([k, t]) => `<option value="${k}"${st.nicho === k ? " selected" : ""}>${t.rotulo}</option>`).join("")}</select>
    <input class="in" style="max-width:220px" id="in-texto" placeholder="Filtrar por nome, bairro…" value="${esc(st.texto)}">
  </div>
  ${barraMassa(lista)}
  ${tabela(lista)}`;
}

function barraMassa(lista) {
  const ids = new Set(lista.map((l) => l.id));
  for (const id of st.sel) if (!ids.has(id)) st.sel.delete(id);   // mantém só o que está visível no filtro
  const n = st.sel.size;
  if (!n) return `<p class="sub" style="margin:-4px 0 10px">${lista.length} empresa(s) · marque as caixas para excluir ou tirar sites do ar em massa</p>`;
  const noAr = lista.filter((l) => st.sel.has(l.id) && l.demo_publicada).length;
  return `<div class="massa" role="region" aria-label="Ações em massa">
    <b>${n} selecionada(s)</b><span class="sub">de ${lista.length}</span>
    <span class="esp"></span>
    <button class="btn" data-acao="massa-fora" ${noAr ? "" : "disabled"}>Tirar ${noAr || ""} site(s) do ar</button>
    <button class="btn perigo cheio" data-acao="massa-excluir">Excluir ${n}</button>
    <button class="btn" data-acao="massa-limpar">Limpar seleção</button>
  </div>`;
}

const lotes = (arr, n = 80) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function massa(acao) {
  const ids = [...st.sel];
  if (!ids.length) return;
  if (acao === "excluir") {
    const nomes = ids.slice(0, 5).map((id) => "• " + nomeCurto(leadPorId(id)?.nome || "")).join("\n") + (ids.length > 5 ? `\n… e mais ${ids.length - 5}` : "");
    if (!confirm(`Excluir ${ids.length} empresa(s) e os sites demo delas?\n\n${nomes}\n\nOs links enviados param de abrir. Não dá para desfazer (se aparecerem numa próxima busca, voltam como novas).`)) return;
    try {
      for (const g of lotes(ids)) await sb.db(`leads?id=in.(${g.join(",")})`, { method: "DELETE", prefer: "return=minimal" });
      st.leads = st.leads.filter((l) => !st.sel.has(l.id));
      if (st.busca) st.busca.leads = st.busca.leads.filter((l) => !st.sel.has(l.id));
      toast(`${ids.length} excluída(s).`);
    } catch (e) { toast(e.message, true); }
  } else {
    const alvo = ids.filter((id) => leadPorId(id)?.demo_publicada);
    if (!alvo.length) return;
    if (!confirm(`Tirar ${alvo.length} site(s) demo do ar? As empresas continuam na lista; os links param de abrir até você publicar de novo.`)) return;
    try {
      for (const g of lotes(alvo)) {
        const novos = await sb.db(`leads?id=in.(${g.join(",")})`, { method: "PATCH", body: { demo_publicada: false } });
        for (const n of novos || []) { const i = st.leads.findIndex((l) => l.id === n.id); if (i >= 0) st.leads[i] = n; }
      }
      toast(`${alvo.length} site(s) fora do ar.`);
    } catch (e) { toast(e.message, true); }
  }
  st.sel.clear(); render();
}

function tabela(L) {
  if (!L.length) return `<div class="card vazio"><b>Nada por aqui</b>${st.leads.length ? "Nenhuma empresa neste filtro." : "Faça uma busca para começar."}</div>`;
  return `<div class="tab-wrap"><table><thead><tr><th class="ck"><input type="checkbox" data-sel="todos" aria-label="Selecionar todas desta lista"${L.every((l) => st.sel.has(l.id)) ? " checked" : ""}></th><th>Empresa</th><th>Presença digital</th><th>Contato</th><th>Status</th><th>Demo</th></tr></thead><tbody>
  ${L.map((l) => `<tr data-abrir="${l.id}"${st.sel.has(l.id) ? ' class="marcada"' : ""}>
    <td class="ck" data-sel="${l.id}"><input type="checkbox" data-sel="${l.id}" aria-label="Selecionar ${esc(nomeCurto(l.nome))}"${st.sel.has(l.id) ? " checked" : ""}></td>
    <td><div class="nome">${l.favorito ? '<span class="estrela">★</span> ' : ""}${esc(nomeCurto(l.nome))}</div>
      <div class="sub">${esc(l.categoria || TEMAS[l.nicho]?.rotulo || "")} · ${esc(l.bairro || l.cidade)} · <span class="estrela">★</span> ${notaBR(l.nota)} (${milhar(l.avaliacoes)})</div>
      ${l.qualificado ? "" : `<div class="sub">${esc(l.motivo)}</div>`}</td>
    <td>${seloFalha(l)}</td>
    <td class="mono">${esc(l.telefone || "—")}<div class="sub">${numeroWhats(l) ? "WhatsApp provável" : l.telefone ? "fixo" : ""}</div></td>
    <td>${seloStatus(l)}${l.enviado_em ? `<div class="sub">${quando(l.enviado_em)}</div>` : ""}</td>
    <td>${l.demo_publicada ? `<span class="selo v">no ar</span>` : `<span class="selo c">rascunho</span>`}${l.visualizacoes ? `<div class="sub">${I.olho} ${l.visualizacoes}x</div>` : ""}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function telaFila() {
  const fila = filaLista();
  const total = fila.length + st.leads.filter((l) => l.qualificado && l.status !== "novo" && numeroWhats(l)).length;
  if (!fila.length) return `<div class="card vazio"><b>Fila vazia</b>Não há empresas qualificadas com WhatsApp esperando mensagem. <a href="#buscar">Fazer uma busca</a></div>`;
  st.filaPos = Math.min(st.filaPos, fila.length - 1);
  const l = fila[st.filaPos];
  const feitos = total - fila.length;
  return `<div class="sub">${feitos} enviadas de ${total} · faltam ${fila.length}</div>
  <div class="progresso"><i style="width:${total ? (feitos / total) * 100 : 0}%"></i></div>
  ${!st.perfil.nome_vendedor ? `<div class="aviso">Coloque seu nome em <a href="#config">Configurações</a> antes de enviar.</div>` : ""}
  <div class="fila">
    <div class="card">
      <div class="ferr"><div><div class="nome" style="font-size:17px">${esc(nomeCurto(l.nome))}</div>
        <div class="sub">${esc(l.categoria)} · ${esc(l.bairro || l.cidade)} · <span class="estrela">★</span> ${notaBR(l.nota)} (${milhar(l.avaliacoes)})</div></div>
        <span class="esp"></span>${seloFalha(l)}</div>
      <p style="color:var(--t2);margin:0 0 12px">${esc(l.motivo)}</p>
      ${chipsEstilo(l, "fila-msg", ["primeiro"])}
      <div class="bloco"><label>Mensagem (pode editar antes de enviar)</label><textarea class="in" id="fila-msg" data-dono="${l.id}" rows="9">${esc(msgDe(l))}</textarea></div>
      <div class="linha-btns">
        <button class="btn z g" data-acao="fila-enviar" data-id="${l.id}">${I.zap} Enviar no WhatsApp e ir para a próxima</button>
        <button class="btn" data-acao="fila-pular">Pular</button>
        <a class="btn" href="https://www.google.com/search?q=${encodeURIComponent(`"${nomeCurto(l.nome)}" ${l.cidade || ""}`)}" target="_blank" rel="noopener">Conferir no Google</a>
        <button class="btn perigo" data-acao="tem-site" data-id="${l.id}">Já tem site</button>
        <button class="btn perigo" data-acao="fila-descartar" data-id="${l.id}">Descartar</button>
        <button class="btn" data-abrir="${l.id}">Detalhes</button>
      </div>
      <p class="sub" style="margin-top:12px">Ao clicar, o WhatsApp abre com a mensagem pronta e o site demo é publicado. Você só aperta enviar lá. Confira se a empresa não tem site antes: <a href="https://www.google.com/search?q=${encodeURIComponent(`${nomeCurto(l.nome)} ${l.cidade}`)}" target="_blank" rel="noopener">pesquisar no Google</a>.</p>
    </div>
    <div class="celular"><iframe data-prev="${l.id}" title="Pré-visualização do site demo"></iframe></div>
  </div>`;
}

function telaGaveta() {
  const lead = leadPorId(st.aberto) || st.busca?.leads.find((x) => x.id === st.aberto);
  if (!lead) return "";
  const l = sanitizeLeadUrls(lead);
  const num = numeroWhats(l);
  const link = linkSite(l);
  return `<div class="fundo" data-acao="fechar"></div><aside class="gaveta">
  <div class="cab"><div><h2>${esc(nomeCurto(l.nome))}</h2><div class="sub">${esc(l.categoria)} · <span class="estrela">★</span> ${notaBR(l.nota)} (${milhar(l.avaliacoes)}) · ${seloFalha(l)} ${seloStatus(l)}</div></div>
    <button class="btn fechar" data-acao="fechar">Fechar</button></div>
  <div class="det"><div>
    <div class="aviso info" style="margin-bottom:14px">${esc(l.motivo)}</div>
    <dl class="info">
      <dt>Telefone</dt><dd>${l.telefone ? `<a href="tel:+55${digitos(l.telefone)}">${esc(l.telefone)}</a> ${num ? "· WhatsApp provável" : "· fixo (confirme se tem WhatsApp)"}` : "—"}</dd>
      <dt>Endereço</dt><dd>${esc(l.endereco || "—")}</dd>
      ${l.site ? `<dt>Link na ficha</dt><dd><a href="${esc(l.site)}" target="_blank" rel="noopener">${esc(l.site)}</a></dd>` : ""}
      ${l.instagram ? `<dt>Instagram</dt><dd><a href="${esc(l.instagram)}" target="_blank" rel="noopener">${esc(l.instagram)}</a></dd>` : ""}
      ${l.facebook ? `<dt>Facebook</dt><dd><a href="${esc(l.facebook)}" target="_blank" rel="noopener">${esc(l.facebook)}</a></dd>` : ""}
      <dt>Google</dt><dd><a href="${esc(linkMaps(l))}" target="_blank" rel="noopener">Ver no Maps</a> · <a href="https://www.google.com/search?q=${encodeURIComponent(`${nomeCurto(l.nome)} ${l.cidade}`)}" target="_blank" rel="noopener">conferir se tem site</a></dd>
      <dt>Site demo</dt><dd>${l.demo_publicada ? `<span class="selo v">no ar</span> <a href="${esc(link)}" target="_blank" rel="noopener">abrir</a>` : `<span class="selo c">rascunho (vai ao ar quando você enviar)</span>`}
        ${l.visualizacoes ? `<div class="sub">${I.olho} aberto ${l.visualizacoes}x · último ${quando(l.ultima_visualizacao)}</div>` : ""}</dd>
    </dl>
    <div class="linha-btns" style="margin-bottom:16px">
      <button class="btn" data-acao="publicar" data-id="${l.id}">${l.demo_publicada ? "Tirar demo do ar" : "Publicar demo"}</button>
      <button class="btn" data-acao="copiar-link" data-id="${l.id}">Copiar link da demo</button>
      <button class="btn" data-acao="favorito" data-id="${l.id}">${l.favorito ? "★ Favorito" : "☆ Favoritar"}</button>
    </div>
    <div class="bloco prop"><label>Proposta com valores (só pelo WhatsApp)</label>
      <p class="sub" style="margin:0 0 8px">${(st.perfil.planos || []).map((x) => `${esc(x.nome)}: ${reais(x.preco)}`).join(" · ") || "Cadastre seus planos em Configurações."} <a href="#config">editar</a></p>
      <div class="linha-btns">
        ${num ? `<button class="btn z" data-acao="enviar-proposta" data-id="${l.id}">${I.zap} Enviar proposta no WhatsApp</button>` : ""}
        <button class="btn" data-acao="copiar-proposta" data-id="${l.id}">Copiar proposta</button>
        <button class="btn" data-estilo="proposta" data-id="${l.id}" data-alvo="det-msg">Colocar na mensagem</button>
      </div>
    </div>
    ${chipsEstilo(l, "det-msg", l.status === "novo" ? ["primeiro", "resposta"] : ["seguimento", "resposta", "primeiro"])}
    <div class="bloco"><label>Mensagem ${l.mensagem != null ? "(editada)" : "(automática)"}</label><textarea class="in" id="det-msg" data-dono="${l.id}" rows="9">${esc(msgDe(l))}</textarea>
      <div class="linha-btns" style="margin-top:8px">
        ${num ? `<button class="btn z" data-acao="enviar" data-id="${l.id}">${I.zap} Enviar no WhatsApp</button>` : `<a class="btn" href="tel:+55${digitos(l.telefone)}">Ligar</a>`}
        <button class="btn" data-acao="copiar-msg">Copiar</button>
        <button class="btn" data-acao="salvar-msg" data-id="${l.id}">Salvar texto</button>
        ${l.mensagem != null ? `<button class="btn" data-acao="msg-auto" data-id="${l.id}">Voltar ao automático</button>` : ""}
      </div></div>
    <div class="bloco"><label>Status</label><select class="in" id="det-status" data-id="${l.id}" style="max-width:260px">${Object.entries(STATUS).map(([k, r]) => `<option value="${k}"${l.status === k ? " selected" : ""}>${r}</option>`).join("")}</select></div>
    <div class="bloco"><label>Observações</label><textarea class="in" id="det-obs" data-dono="${l.id}" rows="4" placeholder="Ex.: falei com o dono, pediu orçamento, retornar sexta…">${esc(l.observacoes)}</textarea>
      <div class="linha-btns" style="margin-top:8px"><button class="btn" data-acao="salvar-obs" data-id="${l.id}">Salvar observação</button>
      <span class="esp" style="flex:1"></span><button class="btn perigo" data-acao="tem-site" data-id="${l.id}">Já tem site</button><button class="btn perigo" data-acao="excluir" data-id="${l.id}">Excluir lead</button></div></div>
  </div>
  <div class="celular"><iframe data-prev="${l.id}" title="Pré-visualização do site demo"></iframe></div></div>
  </aside>`;
}

function telaConfig() {
  const p = st.perfil;
  return `<div style="max-width:680px;display:flex;flex-direction:column;gap:14px">
  <form class="card" id="f-perfil"><h3>Você</h3>
    <div class="form-busca" style="grid-template-columns:2fr 2fr 1fr">
      <div class="campo"><label>Seu nome (vai na mensagem)</label><input class="in" name="nome_vendedor" value="${esc(p.nome_vendedor)}"></div>
      <div class="campo"><label>Cidade padrão</label><input class="in" name="cidade_padrao" value="${esc(p.cidade_padrao)}" placeholder="Nova Iguaçu"></div>
      <div class="campo"><label>UF</label><select class="in" name="uf_padrao"><option value="">UF</option>${UFS.map((u) => `<option${u === p.uf_padrao ? " selected" : ""}>${u}</option>`).join("")}</select></div>
    </div>
    <h3 style="margin-top:18px">Filtro de qualificação</h3>
    <div class="form-busca" style="grid-template-columns:1fr 1fr">
      <div class="campo"><label>Nota mínima no Google</label><input class="in" name="nota_minima" type="number" min="0" max="5" step="0.1" value="${p.nota_minima}"></div>
      <div class="campo"><label>Mínimo de avaliações</label><input class="in" name="avaliacoes_minimas" type="number" min="0" step="1" value="${p.avaliacoes_minimas}"></div>
    </div>
    <p class="sub">Vale para as próximas buscas. Empresa qualificada = nota e avaliações acima disso, com telefone, e sem site próprio.</p>
    <div class="linha-btns" style="margin-top:10px"><button class="btn p" type="submit">Salvar</button></div>
  </form>
  <form class="card" id="f-propostas"><h3>Planos e valores</h3>
    <p class="sub" style="margin:-6px 0 12px">Os valores nunca aparecem no site. Eles vão só nas mensagens de WhatsApp "Proposta com valores" e "Quando perguntar o preço".</p>
    <div class="campo" style="max-width:180px"><label>Validade da proposta (dias)</label><input class="in" name="validade_dias" type="number" min="1" max="90" value="${p.validade_dias || 7}"></div>
    ${(p.planos || PLANOS_PADRAO).map((pl, i) => `<fieldset class="plano-ed">
      <legend>Plano ${i + 1}</legend>
      <div class="form-busca" style="grid-template-columns:1.4fr 1fr 1.4fr 1fr">
        <div class="campo"><label>Nome</label><input class="in" name="p${i}_nome" value="${esc(pl.nome)}"></div>
        <div class="campo"><label>Preço (R$)</label><input class="in" name="p${i}_preco" inputmode="decimal" value="${esc(String(pl.preco).replace(".", ","))}"></div>
        <div class="campo"><label>Parcelas / observação</label><input class="in" name="p${i}_parcelas" value="${esc(pl.parcelas || "")}"></div>
        <div class="campo"><label>Prazo</label><input class="in" name="p${i}_prazo" value="${esc(pl.prazo || "")}"></div>
      </div>
      <div class="campo" style="margin-top:8px"><label>O que inclui (um item por linha)</label><textarea class="in" name="p${i}_itens" rows="4">${esc((pl.itens || []).join("\n"))}</textarea></div>
      <label class="chk"><input type="checkbox" name="p${i}_destaque"${pl.destaque ? " checked" : ""}> Marcar como recomendado</label>
    </fieldset>`).join("")}
    <div class="campo" style="margin-top:12px"><label>Condições de pagamento</label><textarea class="in" name="condicoes" rows="3">${esc(p.condicoes || "")}</textarea></div>
    <div class="linha-btns" style="margin-top:12px"><button class="btn p" type="submit">Salvar planos</button><button class="btn" type="button" data-acao="plano-padrao">Restaurar sugestão de valores</button></div>
  </form>
  <div class="card"><h3>Exportar</h3><div class="linha-btns">
    <button class="btn" data-acao="csv" data-qual="1">CSV das qualificadas</button><button class="btn" data-acao="csv">CSV de todas</button></div></div>
  <div class="aviso info">A busca usa só a API oficial do Google. Nada é enviado sozinho: o WhatsApp abre com o texto pronto e você confirma o envio. Revise cada empresa antes de abordar.</div>
  </div>`;
}

// ------------------------------------------------------------------ ações
function csv(qual) {
  const L = st.leads.filter((l) => !qual || l.qualificado);
  const cols = [["Empresa", (l) => nomeCurto(l.nome)], ["Categoria", (l) => l.categoria], ["Nicho", (l) => TEMAS[l.nicho]?.rotulo || l.nicho],
    ["Nota", (l) => notaBR(l.nota)], ["Avaliações", (l) => l.avaliacoes ?? ""], ["Telefone", (l) => l.telefone], ["WhatsApp provável", (l) => (numeroWhats(l) ? "Sim" : "Não")],
    ["Endereço", (l) => l.endereco], ["Bairro", (l) => l.bairro], ["Cidade", (l) => l.cidade], ["Presença digital", (l) => FALHAS[l.status_site]],
    ["Link na ficha", (l) => l.site || l.instagram || l.facebook], ["Qualificada", (l) => (l.qualificado ? "Sim" : "Não")], ["Motivo", (l) => l.motivo],
    ["Status", (l) => STATUS[l.status]], ["Enviado em", (l) => (l.enviado_em ? new Date(l.enviado_em).toLocaleString("pt-BR") : "")],
    ["Visualizações da demo", (l) => l.visualizacoes], ["Link da demo", (l) => linkSite(l)], ["Google Maps", (l) => l.maps_url], ["Observações", (l) => l.observacoes]];
  const q = csvCell;
  const txt = "﻿" + [cols.map((c) => q(c[0])).join(";"), ...L.map((l) => cols.map((c) => q(c[1](l))).join(";"))].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv;charset=utf-8" }));
  a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

async function buscar(ev) {
  ev.preventDefault();
  const f = Object.fromEntries(new FormData(ev.target));
  st.form = { ...st.form, ...f };
  if (!f.tipo.trim() || !f.cidade.trim() || !f.uf) { st.erroBusca = "Preencha tipo de empresa, cidade e estado."; return render(); }
  st.buscando = true; st.erroBusca = ""; render();
  try {
    const r = await sb.funcao("buscar-empresas", { ...f, quantidade: Number(f.quantidade) });
    st.busca = r;
    for (const l of r.leads) { const i = st.leads.findIndex((x) => x.id === l.id); i >= 0 ? (st.leads[i] = l) : st.leads.unshift(l); }
    st.buscas = await sb.db("buscas?select=*&order=created_at.desc&limit=8");
    toast(`${r.total} empresas · ${r.qualificados} qualificadas`);
  } catch (e) { st.erroBusca = e.message; }
  st.buscando = false; render();
}

document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-sel],[data-ir],[data-acao],[data-abrir],[data-filtro],[data-tipo],[data-estilo]");
  if (!el) return;
  if (el.dataset.sel) {
    const lista = filtrar(st.leads);
    if (el.dataset.sel === "todos") { const tudo = lista.every((l) => st.sel.has(l.id)); lista.forEach((l) => (tudo ? st.sel.delete(l.id) : st.sel.add(l.id))); }
    else st.sel.has(el.dataset.sel) ? st.sel.delete(el.dataset.sel) : st.sel.add(el.dataset.sel);
    return render();
  }
  if (el.dataset.ir) { location.hash = el.dataset.ir; return; }
  if (el.dataset.abrir) { ev.preventDefault(); st.aberto = el.dataset.abrir; return render(); }
  if (el.dataset.filtro) { st.filtro = el.dataset.filtro; return render(); }
  if (el.dataset.estilo) {
    const ld = leadPorId(el.dataset.id); const ta = document.getElementById(el.dataset.alvo);
    if (!ld || !ta) return;
    st.estilo[ld.id] = el.dataset.estilo;
    ta.value = mensagemEstilo(el.dataset.estilo, ld, st.perfil, linkSite(ld));
    el.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === el));
    if (/\[VALOR\]|\[PRAZO\]/.test(ta.value)) toast("Troque [VALOR] e [PRAZO] antes de enviar.");
    return;
  }
  if (el.dataset.tipo) { st.form.tipo = el.dataset.tipo; const i = document.querySelector('#f-busca [name="tipo"]'); if (i) i.value = el.dataset.tipo; document.querySelectorAll("[data-tipo]").forEach((c) => c.classList.toggle("on", c === el)); return; }
  const id = el.dataset.id, l = id && leadPorId(id), a = el.dataset.acao;
  if (a === "sair") { await sb.sair(); return render(); }
  if (a === "menu") { st.menu = !st.menu; return render(); }
  if (a === "fechar") { st.aberto = null; return render(); }
  if (a === "csv") return csv(el.dataset.qual);
  if (a === "massa-limpar") { st.sel.clear(); return render(); }
  if (a === "massa-excluir") return massa("excluir");
  if (a === "massa-fora") return massa("fora");
  if (a === "fila-pular") { st.filaPos++; if (st.filaPos >= filaLista().length) st.filaPos = 0; return render(); }
  if (!l) return;
  if (a === "fila-enviar") { await enviarWhats(l, document.getElementById("fila-msg").value); return; }
  if (a === "fila-descartar") return atualizar(l.id, { status: "descartado" }, "Descartado.");
  if (a === "tem-site") return atualizar(l.id, { status_site: "com_site", qualificado: false, status: "descartado", demo_publicada: false, motivo: "Fora do filtro: já tem site próprio (marcado por você)." }, "Marcada como 'já tem site' e tirada da fila.");
  if (a === "enviar") return enviarWhats(l, document.getElementById("det-msg").value);
  if (a === "publicar") return atualizar(l.id, { demo_publicada: !l.demo_publicada }, l.demo_publicada ? "Demo fora do ar." : "Demo publicada.");
  if (a === "favorito") return atualizar(l.id, { favorito: !l.favorito });
  if (a === "copiar-link") {
    if (!l.demo_publicada) await atualizar(l.id, { demo_publicada: true });
    navigator.clipboard?.writeText(linkSite(l)).then(() => toast("Link copiado (demo publicada)."), () => toast(linkSite(l)));
    return;
  }
  if (a === "copiar-proposta" || a === "enviar-proposta") {
    const texto = mensagemEstilo("proposta", l, st.perfil, linkSite(l));
    if (a === "copiar-proposta") { navigator.clipboard?.writeText(texto).then(() => toast("Proposta copiada."), () => toast("Não deu para copiar.", true)); return; }
    window.open(linkWhats(l, texto), "_blank", "noopener");
    const dados = { demo_publicada: true };
    if (["novo", "enviado"].includes(l.status)) dados.status = "respondeu";
    return atualizar(l.id, dados, "Proposta aberta no WhatsApp.");
  }
  if (a === "plano-padrao") { st.perfil = { ...st.perfil, planos: PLANOS_PADRAO }; toast("Sugestão de planos restaurada. Clique em Salvar planos."); return render(); }
  if (a === "copiar-msg") { navigator.clipboard?.writeText(document.getElementById("det-msg").value).then(() => toast("Mensagem copiada.")); return; }
  if (a === "salvar-msg") return atualizar(l.id, { mensagem: document.getElementById("det-msg").value }, "Mensagem salva.");
  if (a === "msg-auto") return atualizar(l.id, { mensagem: null }, "Voltou para a mensagem automática.");
  if (a === "salvar-obs") return atualizar(l.id, { observacoes: document.getElementById("det-obs").value }, "Observação salva.");
  if (a === "excluir") {
    if (!confirm(`Excluir ${nomeCurto(l.nome)} e o site demo dela? O link enviado para de abrir. Se ela aparecer numa próxima busca, volta como nova.`)) return;
    try { await sb.db(`leads?id=eq.${l.id}`, { method: "DELETE", prefer: "return=minimal" }); st.leads = st.leads.filter((x) => x.id !== l.id); st.sel.delete(l.id); st.aberto = null; toast("Excluído."); render(); }
    catch (e) { toast(e.message, true); }
  }
});

document.addEventListener("change", (ev) => {
  const t = ev.target;
  if (t.id === "sel-status") { st.status = t.value; render(); }
  if (t.id === "sel-nicho") { st.nicho = t.value; render(); }
  if (t.id === "det-status") atualizar(t.dataset.id, { status: t.value }, "Status atualizado.");
  if (t.id === "arq-csv" && t.files[0]) importarCSV(t.files[0]);
});
document.addEventListener("input", (ev) => {
  if (ev.target.id === "in-texto") {
    st.texto = ev.target.value;
    clearTimeout(st._t); st._t = setTimeout(() => { const pos = ev.target.selectionStart; render(); const i = document.getElementById("in-texto"); i.focus(); i.setSelectionRange(pos, pos); }, 250);
  }
});
document.addEventListener("submit", async (ev) => {
  if (ev.target.id === "f-busca") return buscar(ev);
  if (ev.target.id === "f-manual") {
    ev.preventDefault();
    const c = Object.fromEntries(new FormData(ev.target));
    try {
      const [l] = await gravarLeads([montarLead({ ...c, origem: "manual" }, st.perfil)]);
      toast(l.qualificado ? "Empresa adicionada e qualificada." : "Empresa adicionada (fora do filtro: " + l.motivo.replace("Fora do filtro: ", "") + ").");
      st.aberto = l.id; render();
    } catch (e) { toast(e.message, true); }
  }
  if (ev.target.id === "f-propostas") {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const planos = [0, 1, 2].map((i) => ({
      nome: String(f.get(`p${i}_nome`) || "").trim(),
      preco: parseFloat(String(f.get(`p${i}_preco`) || "0").replace(/\./g, "").replace(",", ".")) || 0,
      parcelas: String(f.get(`p${i}_parcelas`) || "").trim(),
      prazo: String(f.get(`p${i}_prazo`) || "").trim(),
      destaque: f.get(`p${i}_destaque`) === "on",
      itens: String(f.get(`p${i}_itens`) || "").split("\n").map((x) => x.trim()).filter(Boolean),
    })).filter((x) => x.nome);
    const corpo = { user_id: sb.usuario().id, planos,
      validade_dias: Math.max(1, Math.min(90, parseInt(f.get("validade_dias"), 10) || 7)), condicoes: String(f.get("condicoes") || "").trim() };
    try {
      const [pf] = await sb.db("perfis?on_conflict=user_id", { method: "POST", body: corpo, prefer: "resolution=merge-duplicates,return=representation" });
      st.perfil = pf; toast("Planos salvos."); render();
    } catch (e) { toast(e.message.includes("column") ? "Rode o SQL de planos no Supabase (veja o README)." : e.message, true); }
    return;
  }
  if (ev.target.id === "f-perfil") {
    ev.preventDefault();
    const f = Object.fromEntries(new FormData(ev.target));
    const corpo = { ...f, user_id: sb.usuario().id, nota_minima: Number(f.nota_minima) || 0, avaliacoes_minimas: Number(f.avaliacoes_minimas) || 0 };
    try {
      const [p] = await sb.db("perfis?on_conflict=user_id", { method: "POST", body: corpo, prefer: "resolution=merge-duplicates,return=representation" });
      st.perfil = p; st.form.cidade ||= p.cidade_padrao; st.form.uf ||= p.uf_padrao; toast("Configurações salvas."); render();
    } catch (e) { toast(e.message, true); }
  }
});
document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && st.aberto) { st.aberto = null; render(); } });
window.addEventListener("hashchange", () => { st.pagina = (location.hash || "#dashboard").slice(1); st.menu = false; st.aberto = null; render(); });

async function importarCSV(arquivo) {
  try {
    let texto = await arquivo.text();
    if (texto.includes("\ufffd")) texto = new TextDecoder("windows-1252").decode(await arquivo.arrayBuffer()); // CSV salvo pelo Excel
    const linhas = lerCSV(texto).map((c) => montarLead(c, st.perfil));
    if (!linhas.length) throw new Error("Nenhuma empresa encontrada na planilha.");
    const unicos = [...new Map(linhas.map((l) => [l.place_id, l])).values()];
    const salvos = [];
    for (let i = 0; i < unicos.length; i += 200) salvos.push(...(await gravarLeads(unicos.slice(i, i + 200))));
    const q = salvos.filter((l) => l.qualificado).length;
    st.importado = `<b>${salvos.length}</b> empresas importadas, <b>${q}</b> qualificadas. <a href="#fila">Ir para a fila de envio →</a>`;
    toast(`${salvos.length} empresas importadas.`);
  } catch (e) { st.importado = ""; toast(e.message, true); }
  render();
}

async function iniciar() {
  if (!sb.usuario()) return render();
  render();
  try { await carregar(); } catch (e) { if (e.status === 401) { await sb.sair(); return render(); } toast(e.message, true); st.carregado = true; }
  render();
}
iniciar();
