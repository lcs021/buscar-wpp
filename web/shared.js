import { safeHttpUrl } from "./url.js";

// Temas por nicho, gerador do site demo e da mensagem de WhatsApp.
// Usado pelo painel (pré-visualização) e pela página pública demo.html.

const ICONES = {
  tesoura: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  chave: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  carro: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M9.5 17h5M3 12h18"/>',
  brilho: '<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  burger: '<path d="M4 10a8 5 0 0 1 16 0z"/><path d="M3 14h18M5 18h14a2 2 0 0 0 2-2H3a2 2 0 0 0 2 2z"/><path d="M4 12h16"/>',
  pizza: '<path d="M12 2 2 20c6 2 14 2 20 0z"/><circle cx="10" cy="12" r="1.2"/><circle cx="14" cy="15" r="1.2"/><circle cx="11" cy="17" r="1.2"/>',
  pata: '<circle cx="5.5" cy="10" r="2"/><circle cx="9.5" cy="5.5" r="2"/><circle cx="14.5" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M12 12c-3 0-6 4-6 6.5S8 21 12 21s6-.5 6-2.5S15 12 12 12z"/>',
  dente: '<path d="M7 3c-2.5 0-4 2-4 5 0 4 2 5 2.5 9 .3 2.5 1 4 2.5 4s2-2 2.5-4.5c.3-1.3.8-2 1.5-2s1.2.7 1.5 2C14 19 14.5 21 16 21s2.2-1.5 2.5-4c.5-4 2.5-5 2.5-9 0-3-1.5-5-4-5-2 0-3 1-5 1S9 3 7 3z"/>',
  pao: '<path d="M4 13c0-5 3.6-8 8-8s8 3 8 8v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9 9l1 3M14 9l-1 3"/>',
  copo: '<path d="M5 8h14l-2 12H7z"/><path d="M4 8a8 4 0 0 1 16 0"/><path d="M12 4V2"/>',
  unha: '<path d="M9 21V10a3 3 0 0 1 6 0v11"/><path d="M9 14h6"/><path d="M10 6.5C10 4 11 2 12 2s2 2 2 4.5"/>',
  prato: '<circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.5"/><path d="M3 3v6M5 3v6M4 9v12M20 3c-1.5 1-2 3-2 6h2v12"/>',
  sacola: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  cruz: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6z"/>',
  haltere: '<path d="M6 7v10M18 7v10M3 9v6M21 9v6M6 12h12"/>',
  loja: '<path d="M3 9l2-5h14l2 5"/><path d="M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  estrela: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  fone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  zap: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/>',
  foto: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 5l1.5-2h5L16 5"/>',
  insta: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
};

export function svg(nome, tam = 24, traco = 1.7, cheio = false) {
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="${cheio ? "currentColor" : "none"}" stroke="currentColor" stroke-width="${cheio ? 0 : traco}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
}

const SERIF = "'Playfair Display','Lora',Georgia,serif";
const CONDENSADA = "'Oswald','Bebas Neue',Impact,'Poppins',sans-serif";
const SANS = "'Poppins','Inter',system-ui,sans-serif";

export const TEMAS = {
  barbearia: { rotulo: "Barbearia", icone: "tesoura", fundo: "#111", fundo2: "#1b1a18", texto: "#f3efe7", suave: "#a59f94", acento: "#c9a86a", acentoTxt: "#141210", titulo: CONDENSADA, caixaAlta: true,
    chamada: "Corte, barba e atendimento de respeito.", cta: "Agendar horário",
    servicos: [["Corte masculino", "Do clássico ao degradê"], ["Barba", "Toalha quente e navalha"], ["Corte + barba", "O combo completo"], ["Sobrancelha", "Acabamento na navalha"], ["Pigmentação", "Para barba e cabelo"], ["Corte infantil", "Para os pequenos"]] },
  salao: { rotulo: "Salão de beleza", icone: "brilho", fundo: "#fbf6f3", fundo2: "#f3e7e1", texto: "#2b1d1d", suave: "#7d6764", acento: "#b0546b", acentoTxt: "#fff", titulo: SERIF,
    chamada: "Cabelo, unhas e cuidado em um só lugar.", cta: "Agendar pelo WhatsApp",
    servicos: [["Corte e escova", "Para todos os tipos de cabelo"], ["Coloração", "Mechas, luzes e tonalização"], ["Tratamentos", "Hidratação e reconstrução"], ["Manicure e pedicure", "Clássica e em gel"], ["Penteados", "Para festas e eventos"], ["Sobrancelhas", "Design e henna"]] },
  manicure: { rotulo: "Manicure / unhas", icone: "unha", fundo: "#fff7f8", fundo2: "#fde8ec", texto: "#2d1a20", suave: "#86656d", acento: "#d6457a", acentoTxt: "#fff", titulo: SERIF,
    chamada: "Unhas impecáveis, do jeito que você gosta.", cta: "Agendar horário",
    servicos: [["Manicure", "Cutilagem e esmaltação"], ["Pedicure", "Cuidado completo dos pés"], ["Alongamento", "Gel, fibra ou acrigel"], ["Esmaltação em gel", "Mais brilho e duração"], ["Nail art", "Decorações personalizadas"], ["Spa dos pés", "Esfoliação e hidratação"]] },
  oficina: { rotulo: "Oficina mecânica", icone: "chave", fundo: "#0f1216", fundo2: "#171c22", texto: "#eef1f4", suave: "#97a2ad", acento: "#f2a20c", acentoTxt: "#111", titulo: CONDENSADA, caixaAlta: true,
    chamada: "Mecânica de confiança para o seu carro.", cta: "Pedir orçamento",
    servicos: [["Revisão", "Preventiva e por quilometragem"], ["Troca de óleo", "Óleo e filtros"], ["Freios", "Pastilhas, discos e fluido"], ["Suspensão", "Amortecedores e alinhamento"], ["Injeção eletrônica", "Diagnóstico por scanner"], ["Ar-condicionado", "Higienização e carga"]] },
  estetica_auto: { rotulo: "Estética automotiva", icone: "carro", fundo: "#06090f", fundo2: "#0d1420", texto: "#eaf2ff", suave: "#8fa3bf", acento: "#38bdf8", acentoTxt: "#04111b", titulo: CONDENSADA, caixaAlta: true,
    chamada: "Seu carro com cara de novo.", cta: "Agendar lavagem",
    servicos: [["Lavagem detalhada", "Externa e interna"], ["Higienização interna", "Bancos, teto e carpete"], ["Polimento", "Remove riscos superficiais"], ["Vitrificação", "Proteção e brilho duradouro"], ["Enceramento", "Brilho e proteção"], ["Limpeza de motor", "Com produtos específicos"]] },
  hamburgueria: { rotulo: "Hamburgueria", icone: "burger", fundo: "#160c07", fundo2: "#22130a", texto: "#fff4e6", suave: "#c7ab8f", acento: "#ff6b1a", acentoTxt: "#160c07", titulo: CONDENSADA, caixaAlta: true,
    chamada: "Burger artesanal, feito na hora.", cta: "Pedir agora",
    servicos: [["Burgers artesanais", "Blend da casa no pão macio"], ["Combos", "Burger, batata e bebida"], ["Porções", "Batata, cheddar e bacon"], ["Bebidas", "Refrigerantes e sucos"], ["Sobremesas", "Para fechar com chave de ouro"], ["Delivery", "Na sua casa"]] },
  pizzaria: { rotulo: "Pizzaria", icone: "pizza", fundo: "#1a0f0c", fundo2: "#26150f", texto: "#fff3e8", suave: "#cfb29b", acento: "#e63b2e", acentoTxt: "#fff", titulo: SERIF,
    chamada: "Pizza quentinha, do forno para a sua mesa.", cta: "Fazer pedido",
    servicos: [["Pizzas salgadas", "Tradicionais e especiais"], ["Pizzas doces", "Para a sobremesa"], ["Bordas recheadas", "Catupiry, cheddar e mais"], ["Bebidas", "Refrigerantes e sucos"], ["Entrega", "Na região"], ["Retirada", "Peça e busque no balcão"]] },
  acai: { rotulo: "Açaí", icone: "copo", fundo: "#1b0b2a", fundo2: "#26103b", texto: "#f7eeff", suave: "#c3a8db", acento: "#a3e635", acentoTxt: "#1b0b2a", titulo: SANS,
    chamada: "Açaí cremoso, do seu jeito.", cta: "Pedir açaí",
    servicos: [["Açaí no copo", "Vários tamanhos"], ["Monte o seu", "Escolha os acompanhamentos"], ["Cremes", "Ninho, cupuaçu e mais"], ["Frutas", "Banana, morango e outras"], ["Caldas", "Para finalizar"], ["Delivery", "Na sua casa"]] },
  pet: { rotulo: "Pet shop", icone: "pata", fundo: "#f4fbf8", fundo2: "#e1f4ec", texto: "#12322a", suave: "#5c7b72", acento: "#14a37f", acentoTxt: "#fff", titulo: SANS,
    chamada: "Cuidado e carinho de verdade com o seu pet.", cta: "Agendar banho",
    servicos: [["Banho", "Produtos próprios para pets"], ["Tosa higiênica", "Conforto e limpeza"], ["Tosa na tesoura", "Acabamento caprichado"], ["Hidratação", "Pelagem macia e brilhante"], ["Corte de unhas", "Com segurança"], ["Produtos", "Rações e acessórios"]] },
  dentista: { rotulo: "Dentista", icone: "dente", fundo: "#f6fafc", fundo2: "#e6f1f6", texto: "#11303d", suave: "#5d7884", acento: "#0e7c9e", acentoTxt: "#fff", titulo: SANS,
    chamada: "Cuidado com o seu sorriso, perto de você.", cta: "Agendar consulta",
    servicos: [["Avaliação", "Consulta e plano de tratamento"], ["Limpeza", "Profilaxia e prevenção"], ["Restaurações", "Tratamento de cáries"], ["Clareamento", "Após avaliação"], ["Próteses", "Após avaliação"], ["Urgências", "Consulte disponibilidade"]] },
  padaria: { rotulo: "Padaria / confeitaria", icone: "pao", fundo: "#fbf5ea", fundo2: "#f3e6cf", texto: "#3a2614", suave: "#7d6550", acento: "#b4651e", acentoTxt: "#fff", titulo: SERIF,
    chamada: "Pão quentinho e aquele cafezinho de todo dia.", cta: "Fazer encomenda",
    servicos: [["Pães", "Fresquinhos ao longo do dia"], ["Confeitaria", "Bolos, tortas e doces"], ["Salgados", "Para o lanche e para festas"], ["Café", "Café, pingado e cappuccino"], ["Frios", "Fatiados na hora"], ["Encomendas", "Bolos e salgados para eventos"]] },
  restaurante: { rotulo: "Restaurante", icone: "prato", fundo: "#14110d", fundo2: "#1f1a14", texto: "#f7efe3", suave: "#bba98f", acento: "#e0a43a", acentoTxt: "#14110d", titulo: SERIF,
    chamada: "Comida boa, feita com capricho.", cta: "Fazer pedido",
    servicos: [["Pratos do dia", "Comida caseira"], ["Cardápio", "Opções para todos os gostos"], ["Bebidas", "Sucos e refrigerantes"], ["Sobremesas", "Para fechar bem"], ["Para viagem", "Peça e retire"], ["Entrega", "Na região"]] },
  loja: { rotulo: "Loja", icone: "sacola", fundo: "#faf8f5", fundo2: "#efe9e1", texto: "#1f1a17", suave: "#6f665e", acento: "#1f1a17", acentoTxt: "#faf8f5", titulo: SERIF,
    chamada: "Estilo e qualidade pertinho de você.", cta: "Falar com a loja",
    servicos: [["Novidades", "Chegando toda semana"], ["Feminino", "Peças para o dia a dia"], ["Masculino", "Do casual ao social"], ["Acessórios", "Para completar o visual"], ["Atendimento", "Ajuda para escolher"], ["Encomendas", "Peça pelo WhatsApp"]] },
  clinica: { rotulo: "Clínica", icone: "cruz", fundo: "#f5f9fb", fundo2: "#e5eff4", texto: "#14303d", suave: "#5b7684", acento: "#2a7fa8", acentoTxt: "#fff", titulo: SANS,
    chamada: "Atendimento atencioso, perto de você.", cta: "Agendar atendimento",
    servicos: [["Consultas", "Agende seu horário"], ["Avaliação", "Atendimento individual"], ["Retornos", "Acompanhamento"], ["Convênios", "Consulte disponibilidade"], ["Particular", "Consulte valores"], ["Localização", "Fácil acesso"]] },
  academia: { rotulo: "Academia", icone: "haltere", fundo: "#0b0b0d", fundo2: "#151519", texto: "#f2f2f5", suave: "#9a9aa6", acento: "#e11d48", acentoTxt: "#fff", titulo: CONDENSADA, caixaAlta: true,
    chamada: "Treine perto de casa, com estrutura completa.", cta: "Agendar aula experimental",
    servicos: [["Musculação", "Equipamentos e orientação"], ["Aeróbicos", "Esteira, bike e elíptico"], ["Aulas coletivas", "Consulte a grade"], ["Planos", "Mensal, trimestral e anual"], ["Avaliação física", "Consulte disponibilidade"], ["Horários", "Consulte o funcionamento"]] },
  generico: { rotulo: "Comércio", icone: "loja", fundo: "#0f1412", fundo2: "#17201c", texto: "#ecf3ef", suave: "#97a89f", acento: "#22c55e", acentoTxt: "#04140a", titulo: SANS,
    chamada: "Atendimento de qualidade em Nova Iguaçu.", cta: "Falar com a gente",
    servicos: [["Atendimento", "Fale com a gente pelo WhatsApp"], ["Qualidade", "Avaliado pelos clientes no Google"], ["Localização", "Fácil de chegar"], ["Orçamentos", "Peça o seu"], ["Novidades", "Acompanhe nas redes"], ["Horários", "Consulte o funcionamento"]] },
};

export const FALHAS = {
  sem_site: "Sem URL de site informada",
  instagram: "Só Instagram",
  facebook: "Só Facebook",
  whatsapp: "Só WhatsApp",
  link_agregador: "Só link de pedido/agenda",
  com_site: "Tem site",
};

export const STATUS = {
  novo: "Novo", enviado: "Mensagem enviada", respondeu: "Respondeu", interessado: "Interessado",
  fechado: "Fechou negócio", perdido: "Não quis", descartado: "Descartado",
};

// ------------------------------------------------------------------ helpers
export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const digitos = (t) => String(t || "").replace(/\D/g, "");
export const notaBR = (n) => (n == null ? "–" : Number(n).toFixed(1).replace(".", ","));
export const milhar = (n) => Number(n || 0).toLocaleString("pt-BR");

export function numeroWhats(l) {
  if (l.whatsapp && /^\d{10,15}$/.test(l.whatsapp)) return l.whatsapp.startsWith("55") ? l.whatsapp : "55" + l.whatsapp;
  if (l.celular) { const d = digitos(l.telefone); if (d.length === 13 && d.startsWith("55")) return d; return "55" + d.replace(/^0+/, ""); }
  return "";
}
export const linkMaps = (l) => safeHttpUrl(l.maps_url) || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${l.nome}, ${l.endereco}`);

export function iniciais(nome) {
  const ign = new Set(["de", "da", "do", "das", "dos", "e", "&", "o", "a"]);
  const p = String(nome).replace(/[|—–-]/g, " ").split(/\s+/).filter((x) => x && !ign.has(x.toLowerCase()) && /[\p{L}\d]/u.test(x));
  return ((p[0]?.[0] || "?") + (p[1]?.[0] || "")).toUpperCase();
}
// "Legendários Barbearia | Barbearia em Nova Iguaçu" -> "Legendários Barbearia"
export const nomeCurto = (n) => String(n || "").split(/\s[|•·]\s/)[0].trim();
// Link que vai na mensagem: o site próprio do lead (leads.site_demo), ou o site cinematográfico gerado na hora.
export const linkSite = (l) => safeHttpUrl(l && l.site_demo) || new URL(`site.html?s=${encodeURIComponent(l.slug)}`, location.href.replace(/[#?].*$/, "")).href;
// Demo antigo: continua no ar para os links que já foram enviados.
export const linkDemo = (slug) => new URL(`demo.html?s=${encodeURIComponent(slug)}`, location.href.replace(/[#?].*$/, "")).href;

// ------------------------------------------------------------------ mensagem
export function mensagem(l, perfil = {}, link = "") {
  const nome = perfil.nome_vendedor?.trim() || "[SEU NOME]";
  const emp = nomeCurto(l.nome);
  const prova = l.nota && l.avaliacoes ? `, nota ${notaBR(l.nota)} com ${milhar(l.avaliacoes)} avaliações,` : "";
  const gancho = {
    sem_site: "e reparei que a ficha ainda não tem site.",
    instagram: 'mas o botão "Site" da ficha abre só o Instagram.',
    facebook: 'mas o botão "Site" da ficha abre só o Facebook.',
    whatsapp: 'mas o botão "Site" da ficha leva só para o WhatsApp.',
    link_agregador: "mas o link da ficha leva direto para o app de pedido/agendamento, sem uma página da marca.",
    com_site: "e tive uma ideia para o site de vocês.",
  }[l.status_site] || "";
  const extra = {
    instagram: " O Instagram continua sendo o principal; o site é a vitrine para quem pesquisa no Google.",
    link_agregador: " O pedido/agendamento continua do jeito que vocês já usam; é só uma vitrine para quem pesquisa no Google.",
    whatsapp: " O atendimento continua no WhatsApp; o site só ajuda quem pesquisa no Google a chegar até vocês.",
  }[l.status_site] || "";
  return `Olá, tudo bem? Aqui é o ${nome}. Encontrei ${emp} no Google Maps${prova} ${gancho}`
    + ` Montei um modelo de site só para vocês verem como ficaria, com as informações que já estão no Google:\n\n${link || "[link do site demo]"}\n\n`
    + `É só uma demonstração, sem compromisso.${extra} Faz sentido para vocês?\n\n_(Se vocês já tiverem um site e eu não encontrei, me desculpa e pode desconsiderar.)_`;
}

// ------------------------------------------------------------------ site demo (layouts por nicho em demo-render.js)
export { renderDemo } from "./demo-render.js";
export { renderSite } from "./site-render.js";

// ------------------------------------------------------------------ cadastro sem Google (manual / planilha)
const NICHOS_RE = [
  ["estetica_auto", /est[ée]tica automotiva|lava[- ]?(r[áa]pido|jato|car)|detail|polimento|car wash/i],
  ["oficina", /oficina|mec[âa]nic|auto ?center|autope[çc]as|centro automotivo|pneu|funilaria|troca de [óo]leo/i],
  ["barbearia", /barb/i],
  ["manicure", /unha|manicure|nail|esmalt/i],
  ["salao", /sal[ãa]o|cabeleire|beauty|beleza|hair|est[ée]tica|sobrancelha/i],
  ["hamburgueria", /hamb[uú]rg|burg/i],
  ["pizzaria", /pizz/i],
  ["acai", /a[çc]a[íi]|sorvet/i],
  ["pet", /pet|banho e tosa|veterin/i],
  ["dentista", /dent|odonto|ortodon/i],
  ["padaria", /padaria|confeitaria|doces|bolo|panifica/i],
  ["academia", /academia|crossfit|fitness|muscula|pilates/i],
  ["clinica", /cl[íi]nica|fisioter|psic|nutri|m[ée]dic|sa[úu]de/i],
  ["loja", /loja|roupa|moda|boutique|cal[çc]ado|acess[óo]rio|[óo]tica/i],
  ["restaurante", /restaurante|lanchonete|churrasc|japon|sushi|marmit|comida|caf[ée]|self[- ]service/i],
];
export function detectarNicho(...t) {
  const s = t.filter(Boolean).join(" ");
  if (TEMAS[s]) return s;
  for (const [n, re] of NICHOS_RE) if (re.test(s)) return n;
  return "generico";
}
export function ehCelularBR(tel) {
  let d = digitos(tel);
  if (d.startsWith("55") && d.length === 13) d = d.slice(2);
  d = d.replace(/^0+/, "");
  return d.length === 11 && d[2] === "9";
}
// Entende "Apenas Instagram", "Só link de pedido", "Site não identificado", URLs etc.
export function statusSiteDe(texto, url = "") {
  const t = `${texto || ""} ${url || ""}`.toLowerCase();
  if (/instagram/.test(t)) return "instagram";
  if (/facebook|fb\.com/.test(t)) return "facebook";
  if (/whats|wa\.me/.test(t)) return "whatsapp";
  if (/link|card[áa]pio|pedido|agenda|ifood|menudino|pedir\.to|linktr/.test(t)) return "link_agregador";
  if (/possui site|com site|tem site|com_site/.test(t)) return "com_site";
  if (/https?:\/\//.test(t)) return "com_site";
  return "sem_site";
}
export function qualificarLocal(l, perfil = {}) {
  const min = Number(perfil.nota_minima ?? 4.5), minAv = Number(perfil.avaliacoes_minimas ?? 20);
  const m = [];
  if (l.site_evidence_status === "unverified" || !l.site_evidence_status) m.push("presença digital ainda não verificada");
  if (l.status_site === "com_site") m.push("já tem site próprio");
  if (l.status_site === "link_agregador") m.push("a ficha já leva para uma página de pedido/agenda (o dono costuma chamar de site)");
  if (l.nota != null && l.nota < min) m.push(`nota ${notaBR(l.nota)} abaixo de ${notaBR(min)}`);
  if (l.avaliacoes != null && l.avaliacoes < minAv) m.push(`${l.avaliacoes} avaliações (mínimo ${minAv})`);
  if (!l.telefone && !l.whatsapp) m.push("sem telefone");
  if (m.length) return { qualificado: false, motivo: "Fora do filtro: " + m.join("; ") };
  const prova = l.nota != null && l.avaliacoes != null ? `nota ${notaBR(l.nota)} com ${milhar(l.avaliacoes)} avaliações` : "cadastrada por você";
  const falha = { sem_site: l.site_evidence_status === "confirmed_no_site" ? "site próprio confirmado como ausente" : "Google Places não informou URL de site nesta consulta",
    instagram: "o site da ficha é só o Instagram", facebook: "o site da ficha é só o Facebook",
    whatsapp: "o site da ficha é só o WhatsApp", link_agregador: "o site da ficha é só um link de pedido/agenda/cardápio" }[l.status_site] || "não tem site";
  return { qualificado: true, motivo: `Bom negócio (${prova}) e ${falha}.` };
}
const CAMPOS_CRM = new Set(["status", "favorito", "observacoes", "mensagem", "demo_publicada", "visualizacoes", "ultima_visualizacao", "enviado_em"]);
export function leadParaGravacao(l) {
  return Object.fromEntries(Object.entries(l).filter(([k]) => !CAMPOS_CRM.has(k)));
}
// Monta a linha do banco a partir dos campos digitados/importados
export function montarLead(c, perfil = {}) {
  const nota = c.nota === "" || c.nota == null ? null : Math.round(parseFloat(String(c.nota).replace(",", ".")) * 10) / 10;
  const av = c.avaliacoes === "" || c.avaliacoes == null ? null : parseInt(digitos(c.avaliacoes) || "0", 10);
  const l = {
    nome: String(c.nome || "").trim(),
    categoria: String(c.categoria || "").trim(),
    nicho: c.nicho && TEMAS[c.nicho] ? c.nicho : detectarNicho(c.categoria, c.nome),
    telefone: String(c.telefone || "").trim(),
    whatsapp: "",
    endereco: String(c.endereco || "").trim(),
    bairro: String(c.bairro || "").trim(),
    cidade: String(c.cidade || perfil.cidade_padrao || "").trim(),
    uf: String(c.uf || perfil.uf_padrao || "").trim(),
    maps_url: safeHttpUrl(c.maps_url),
    site: "", instagram: "", facebook: "",
    status_site: c.status_site || "sem_site",
    site_evidence_status: "unverified",
    site_evidence_source: c.origem === "planilha" ? "csv" : "manual",
    site_evidence_at: null,
    nota: Number.isFinite(nota) ? Math.min(5, Math.max(0, nota)) : null,
    avaliacoes: Number.isFinite(av) ? av : null,
    busca_termo: c.origem || "manual",
  };
  const link = String(c.link || "").trim();
  if (l.status_site === "instagram") l.instagram = safeHttpUrl(link || c.instagram);
  else if (l.status_site === "facebook") l.facebook = safeHttpUrl(link || c.facebook);
  else if (link) l.site = safeHttpUrl(link);
  if (c.instagram && !l.instagram) l.instagram = safeHttpUrl(c.instagram);
  if (c.facebook && !l.facebook) l.facebook = safeHttpUrl(c.facebook);
  l.celular = ehCelularBR(l.telefone);
  // mesma empresa (nome + telefone) não duplica
  l.place_id = "manual:" + (l.nome + "|" + digitos(l.telefone)).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9|]+/g, "-");
  return { ...l, ...qualificarLocal(l, perfil) };
}
// Lê CSV (separado por ; ou ,) — aceita a planilha da captação e a exportação do Lead Finder
export function lerCSV(texto) {
  texto = texto.replace(/^﻿/, "");
  const sep = (texto.split("\n")[0].match(/;/g) || []).length >= (texto.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
  const linhas = []; let campo = "", linha = [], aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (aspas) { if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') aspas = false; else campo += ch; }
    else if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texto[i + 1] === "\n") i++; linha.push(campo); campo = ""; if (linha.some((x) => x.trim())) linhas.push(linha); linha = []; }
    else campo += ch;
  }
  linha.push(campo); if (linha.some((x) => x.trim())) linhas.push(linha);
  if (linhas.length < 2) return [];
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const cab = linhas[0].map(norm);
  const col = (...nomes) => cab.findIndex((c) => nomes.some((n) => c === n || c.startsWith(n)));
  const ix = {
    nome: col("empresa", "nome"), categoria: col("categoria"), nicho: col("nicho"), telefone: col("telefone", "fone", "whatsapp"),
    endereco: col("endereco"), bairro: col("bairro"), cidade: col("cidade"), uf: col("uf", "estado"),
    nota: col("nota"), avaliacoes: col("avaliacoes"), maps: col("google maps", "link do google", "maps"),
    situacao: col("status do site", "presenca digital", "falha", "situacao"), links: col("links na ficha", "site cadastrado", "link na ficha", "site"),
    instagram: col("instagram"), facebook: col("facebook"),
  };
  if (ix.nome < 0) throw new Error('A planilha precisa de uma coluna "Empresa" ou "Nome".');
  const v = (r, i) => (i >= 0 ? (r[i] || "").trim() : "");
  return linhas.slice(1).map((r) => {
    const situacao = v(r, ix.situacao), links = v(r, ix.links);
    return {
      nome: v(r, ix.nome), categoria: v(r, ix.categoria), nicho: detectarNicho(v(r, ix.nicho), v(r, ix.categoria), v(r, ix.nome)),
      telefone: v(r, ix.telefone), endereco: v(r, ix.endereco), bairro: v(r, ix.bairro), cidade: v(r, ix.cidade), uf: v(r, ix.uf),
      nota: v(r, ix.nota), avaliacoes: v(r, ix.avaliacoes), maps_url: v(r, ix.maps),
      status_site: statusSiteDe(situacao, situacao ? "" : links), link: /^https?:/.test(links) ? links : "",
      instagram: v(r, ix.instagram), facebook: v(r, ix.facebook), origem: "planilha",
    };
  }).filter((c) => c.nome);
}

// ------------------------------------------------------------------ estilos de mensagem ("melhorar mensagem")
export function saudacao(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// Gancho curto sobre a falha encontrada no Google
function gancho(l) {
  return {
    sem_site: "a ficha de vocês no Google ainda não tem site",
    instagram: 'o botão "Site" da ficha de vocês no Google abre só o Instagram',
    facebook: 'o botão "Site" da ficha de vocês no Google abre só o Facebook',
    whatsapp: 'o botão "Site" da ficha de vocês no Google leva só para o WhatsApp',
    link_agregador: "o link da ficha de vocês no Google vai direto para o app de pedido/agenda, sem uma página da marca",
    com_site: "dá para deixar o site de vocês mais forte no celular",
  }[l.status_site] || "a ficha de vocês no Google ainda não tem site";
}

export const ESTILOS = [
  { id: "padrao", rotulo: "Padrão", tipo: "primeiro" },
  { id: "curta", rotulo: "Curta e direta", tipo: "primeiro" },
  { id: "elogio", rotulo: "Elogio primeiro", tipo: "primeiro" },
  { id: "pergunta", rotulo: "Pedir permissão (sem link)", tipo: "primeiro" },
  { id: "ganho", rotulo: "Mostrar o ganho", tipo: "primeiro" },
  { id: "seguimento", rotulo: "Cobrar resposta (2–3 dias depois)", tipo: "seguimento" },
  { id: "abriu", rotulo: "Depois que abriu o site", tipo: "seguimento" },
  { id: "preco", rotulo: "Quando perguntar o preço", tipo: "resposta" },
  { id: "proposta", rotulo: "Proposta com valores", tipo: "resposta" },
];

const rs = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });
const planosAtivos = (perfil) => (perfil.planos || []).filter((x) => x && x.nome);

export function mensagemEstilo(estilo, l, perfil = {}, link = "") {
  const eu = perfil.nome_vendedor?.trim() || "[SEU NOME]";
  const cidade = l.cidade || "";                     // cidade da empresa (nunca a sua)
  const emp = nomeCurto(l.nome);
  const oi = `${saudacao()}! Aqui é o ${eu}.`;
  const prova = l.nota && l.avaliacoes ? `nota ${notaBR(l.nota)} com ${milhar(l.avaliacoes)} avaliações` : "";
  const lk = link || "[link do site demo]";
  switch (estilo) {
    case "curta":
      return `${oi} Vi ${emp} no Google e reparei que ${gancho(l)}. Fiz um modelo de site para vocês verem como ficaria:\n\n${lk}\n\nSem compromisso. O que acharam?\n\n_(Se vocês já tiverem um site e eu não encontrei, me desculpa e pode desconsiderar.)_`;
    case "elogio":
      return `${oi} ${prova ? `Parabéns pelo trabalho: ${prova} no Google não é pra qualquer um!` : `Parabéns pelo trabalho de vocês!`} Só reparei que ${gancho(l)}, e muita gente que pesquisa acaba indo pra concorrência por isso.\n\nMontei um modelo de site com a cara de ${emp}, só pra mostrar como ficaria:\n\n${lk}\n\nÉ só uma demonstração, sem compromisso. Faz sentido pra vocês?\n\n_(Se vocês já tiverem um site e eu não encontrei, me desculpa e pode desconsiderar.)_`;
    case "pergunta":
      return `${oi} Vi ${emp} no Google Maps${prova ? ` (${prova})` : ""} e reparei que ${gancho(l)}.\n\nMontei um modelo de site com o nome e as informações de vocês, só pra mostrar como ficaria. Posso te mandar o link pra você dar uma olhada? Sem compromisso.\n\n_(Se vocês já tiverem um site e eu não encontrei, me desculpa e pode desconsiderar.)_`;
    case "ganho":
      return `${oi} Quando alguém pesquisa "${(TEMAS[l.nicho]?.rotulo || "comércio").toLowerCase()} em ${l.bairro || cidade || "sua região"}" no Google, quem tem site passa mais confiança e recebe mais contato. Vi que ${gancho(l)}${prova ? `, mesmo com ${prova}` : ""}.\n\nPor isso montei um modelo de site para ${emp}, com botão direto pro WhatsApp e mapa:\n\n${lk}\n\nDá uma olhada no celular, sem compromisso. Se curtir, deixo pronto rapidinho.\n\n_(Se vocês já tiverem um site e eu não encontrei, me desculpa e pode desconsiderar.)_`;
    case "seguimento":
      return `${oi} Passando só pra saber se você conseguiu ver o modelo de site que montei para ${emp}:\n\n${lk}\n\nSe quiser, ajusto cores, fotos e serviços do jeito de vocês. Posso te explicar como funciona?`;
    case "abriu":
      return `${oi} E aí, o que achou do modelo de site de ${emp}? Ainda dá pra trocar fotos, cores e colocar os serviços e preços de vocês.\n\n${lk}\n\nQuer que eu te mostre como ficaria a versão final?`;
    case "preco": {
      const pl = planosAtivos(perfil);
      if (!pl.length) return `Ótima pergunta! O site fica com a cara de ${emp}: fotos reais, serviços, botão de WhatsApp, mapa e funciona bem no celular. O valor é R$ [VALOR] e eu entrego em até [PRAZO] depois de receber as fotos e informações. Pode ser?`;
      const linhas = pl.map((x) => `• *${x.nome}*: ${rs(x.preco)}${x.parcelas ? ` ${x.parcelas}` : ""}${x.prazo ? `, entrega em ${x.prazo}` : ""}`).join("\n");
      return `Ótima pergunta! Para ${emp} eu tenho estes planos:\n\n${linhas}\n\nO site fica igual ao modelo que te mandei, só que com as fotos, serviços e preços de vocês. Qual faz mais sentido pra vocês? Te mando os detalhes do que entra em cada um.`;
    }
    case "proposta": {
      const pl = planosAtivos(perfil);
      if (!pl.length) return `${oi} Segue a proposta do site de ${emp}: R$ [VALOR], entrega em [PRAZO]. O modelo continua aqui: ${lk}`;
      const blocos = pl.map((x) => `*${x.nome}${x.destaque ? " (recomendado)" : ""}: ${rs(x.preco)}*${x.parcelas ? ` ${x.parcelas}` : ""}${x.prazo ? `\nEntrega em ${x.prazo}` : ""}\n${(x.itens || []).map((i) => `✓ ${i}`).join("\n")}`).join("\n\n");
      const cond = [perfil.condicoes, perfil.validade_dias ? `Proposta válida por ${perfil.validade_dias} dias.` : ""].filter(Boolean).join("\n");
      return `${oi} Segue a proposta do site de ${emp}:\n\n${blocos}${cond ? `\n\n${cond}` : ""}\n\nO modelo do site continua aqui: ${lk}\n\nQual plano você prefere?`;
    }
    default:
      return mensagem(l, perfil, link).replace(/^Olá, tudo bem\?/, `${saudacao()}, tudo bem?`);
  }
}
