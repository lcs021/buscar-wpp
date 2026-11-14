// Lead Finder Cloud — Edge Function "buscar-empresas"
// Pesquisa empresas na Google Places API (New), classifica a presença digital,
// qualifica (nota/avaliações/falha) e grava na tabela leads sem duplicar.
// Usa só a API oficial do Google. Não envia mensagens.
//
// Segredo necessário (Dashboard > Edge Functions > Secrets): GOOGLE_PLACES_API_KEY

const URL_PLACES = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress", "places.addressComponents",
  "places.nationalPhoneNumber", "places.internationalPhoneNumber", "places.websiteUri",
  "places.googleMapsUri", "places.primaryTypeDisplayName", "places.businessStatus",
  "places.rating", "places.userRatingCount", "nextPageToken",
].join(",");
const MAX_RESULTADOS = 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export class ErroBusca extends Error {
  status: number;
  constructor(msg: string, status = 400) { super(msg); this.status = status; }
}

// ------------------------------------------------------------------ classificação
const AGREGADORES = ["linktr.ee", "linktree", "bio.link", "beacons.ai", "linkbio", "taplink", "lnk.bio",
  "ifood.com.br", "goomer", "anota.ai", "cardapioweb", "aiqfome", "deliverymuch", "menudino", "olaclick",
  "pedir.to", "brendi", "cashbarber", "booksy", "trinks", "agendor", "sites.google.com", "business.site",
  "negocio.site", "bit.ly", "wixsite.com", "carrd.co"];

export type Site = { status_site: string; site: string; instagram: string; facebook: string; whatsapp: string };

function hostIgualOuSubdominio(host: string, dominio: string): boolean {
  return host === dominio || host.endsWith(`.${dominio}`);
}

function urlWebValida(valor: string): URL | null {
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url;
  } catch {
    return null;
  }
}

export function classificarSite(url?: string | null): Site {
  const r: Site = { status_site: "sem_site", site: url || "", instagram: "", facebook: "", whatsapp: "" };
  if (!url) return r;
  const parsed = urlWebValida(url);
  if (!parsed) return { ...r, site: "" };
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (["instagram.com", "instagr.am"].some((d) => hostIgualOuSubdominio(host, d))) return { ...r, status_site: "instagram", instagram: url, site: "" };
  if (["facebook.com", "fb.com", "fb.me"].some((d) => hostIgualOuSubdominio(host, d))) return { ...r, status_site: "facebook", facebook: url, site: "" };
  if (["wa.me", "whatsapp.com", "wa.link"].some((d) => hostIgualOuSubdominio(host, d))) {
    const m = parsed.pathname.match(/\/(\d{10,15})(?:\/|$)/) || parsed.searchParams.get("phone")?.match(/^(\d{10,15})$/);
    return { ...r, status_site: "whatsapp", whatsapp: m ? m[1] : "", site: "" };
  }
  if (AGREGADORES.some((a) => a.includes(".")
    ? hostIgualOuSubdominio(host, a)
    : host.split(".").includes(a))) return { ...r, status_site: "link_agregador" };
  return { ...r, status_site: "com_site" };
}

export function ehCelularBR(tel?: string | null): boolean {
  let d = (tel || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length === 13) d = d.slice(2);
  d = d.replace(/^0+/, "");
  return d.length === 11 && d[2] === "9";
}

const NICHOS: [string, RegExp][] = [
  ["estetica_auto", /est[ée]tica automotiva|lava[- ]?(r[áa]pido|jato|car)|detail|polimento|car wash/i],
  ["oficina", /oficina|mec[âa]nic|auto ?center|autope[çc]as|centro automotivo|pneu|funilaria|el[ée]trica automotiva|troca de [óo]leo/i],
  ["barbearia", /barb/i],
  ["manicure", /unha|manicure|nail|esmalt/i],
  ["salao", /sal[ãa]o|cabeleire|beauty|beleza|hair|est[ée]tica|sobrancelha/i],
  ["hamburgueria", /hamb[uú]rg|burg/i],
  ["pizzaria", /pizz/i],
  ["acai", /a[çc]a[íi]|sorvet/i],
  ["pet", /pet|banho e tosa|veterin/i],
  ["dentista", /dent|odonto|ortodon/i],
  ["padaria", /padaria|confeitaria|doces|bolo|panifica/i],
  ["academia", /academia|crossfit|fitness|muscula|pilates|gin[áa]stica/i],
  ["clinica", /cl[íi]nica|fisioter|psic|nutri|m[ée]dic|sa[úu]de/i],
  ["loja", /loja|roupa|moda|boutique|cal[çc]ado|acess[óo]rio|[óo]tica/i],
  ["restaurante", /restaurante|lanchonete|bar\b|churrasc|japon|sushi|marmit|comida|caf[ée]|food|self[- ]service/i],
];

export function detectarNicho(...textos: string[]): string {
  const t = textos.filter(Boolean).join(" ");
  for (const [nicho, re] of NICHOS) if (re.test(t)) return nicho;
  return "generico";
}

type Comp = { types?: string[]; longText?: string; shortText?: string };
function componente(comps: Comp[] | undefined, tipo: string, curto = false): string {
  for (const c of comps || []) if ((c.types || []).includes(tipo)) return (curto ? c.shortText : c.longText) || "";
  return "";
}

export type Criterios = { nota_minima: number; avaliacoes_minimas: number };

const ROTULO_FALHA: Record<string, string> = {
  sem_site: "sem site na ficha do Google",
  instagram: "o site da ficha é só o Instagram",
  facebook: "o site da ficha é só o Facebook",
  whatsapp: "o site da ficha é só o WhatsApp",
  link_agregador: "o site da ficha é só um link de pedido/agenda/cardápio",
};

export function qualificar(e: { status_site: string; nota: number | null; avaliacoes: number | null; telefone: string; whatsapp: string },
  c: Criterios): { qualificado: boolean; motivo: string } {
  const motivos: string[] = [];
  if (e.status_site === "com_site") motivos.push("já tem site próprio");
  if (e.status_site === "link_agregador") motivos.push("a ficha já leva para uma página de pedido/agenda (o dono costuma chamar de site)");
  if ((e.nota ?? 0) < c.nota_minima) motivos.push(`nota ${e.nota ?? "sem nota"} abaixo de ${c.nota_minima}`);
  if ((e.avaliacoes ?? 0) < c.avaliacoes_minimas) motivos.push(`${e.avaliacoes ?? 0} avaliações (mínimo ${c.avaliacoes_minimas})`);
  if (!e.telefone && !e.whatsapp) motivos.push("sem telefone na ficha");
  if (motivos.length) return { qualificado: false, motivo: "Fora do filtro: " + motivos.join("; ") };
  return {
    qualificado: true,
    motivo: `Bom negócio (nota ${String(e.nota).replace(".", ",")} com ${e.avaliacoes} avaliações) e ${ROTULO_FALHA[e.status_site]}.`,
  };
}

// deno-lint-ignore no-explicit-any
export function normalizar(p: any, termo: string, tipoBuscado: string, c: Criterios) {
  const comps = p.addressComponents as Comp[];
  const telefone = p.nationalPhoneNumber || p.internationalPhoneNumber || "";
  const site = classificarSite(p.websiteUri);
  const categoria = p.primaryTypeDisplayName?.text || "";
  const nota = typeof p.rating === "number" ? Math.round(p.rating * 10) / 10 : null;
  const avaliacoes = typeof p.userRatingCount === "number" ? p.userRatingCount : null;
  const base = {
    place_id: p.id as string,
    nome: p.displayName?.text || "(sem nome)",
    categoria,
    nicho: detectarNicho(categoria, tipoBuscado, p.displayName?.text || ""),
    telefone,
    celular: ehCelularBR(telefone) || site.whatsapp !== "",
    whatsapp: site.whatsapp,
    endereco: p.formattedAddress || "",
    bairro: componente(comps, "sublocality_level_1") || componente(comps, "sublocality"),
    cidade: componente(comps, "administrative_area_level_2") || componente(comps, "locality"),
    uf: componente(comps, "administrative_area_level_1", true),
    maps_url: p.googleMapsUri || "",
    site: site.site,
    instagram: site.instagram,
    facebook: site.facebook,
    status_site: site.status_site,
    nota,
    avaliacoes,
    busca_termo: termo,
    status_negocio: p.businessStatus || "",
  };
  return { ...base, ...qualificar(base, c) };
}

export function montarTermo(tipo: string, cidade: string, uf: string, bairro = ""): string {
  const local = [bairro.trim(), cidade.trim()].filter(Boolean).join(", ");
  return [tipo.trim(), local ? `em ${local}` : "", uf.trim() ? `- ${uf.trim()}` : ""].filter(Boolean).join(" ");
}

// ------------------------------------------------------------------ Google Places
// deno-lint-ignore no-explicit-any
async function postPlaces(apiKey: string, corpo: unknown): Promise<any> {
  const r = await fetch(URL_PLACES, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": FIELD_MASK },
    body: JSON.stringify(corpo),
  });
  if (r.ok) return await r.json();
  let msg = "";
  try { msg = (await r.json())?.error?.message || ""; } catch { /* sem corpo */ }
  if (r.status === 401 || r.status === 403) {
    throw new ErroBusca("O Google recusou a chave. Confira a GOOGLE_PLACES_API_KEY e se a 'Places API (New)' está ativada. " + msg);
  }
  if (r.status === 429) throw new ErroBusca("Limite de uso da Google Places API atingido. Tente mais tarde.", 429);
  throw new ErroBusca(`Erro ${r.status} do Google: ${msg}`, 502);
}

export async function pesquisarPlaces(apiKey: string, tipo: string, cidade: string, uf: string, bairro: string,
  quantidade: number, c: Criterios, espera = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  const termo = montarTermo(tipo, cidade, uf, bairro);
  const qtd = Math.max(1, Math.min(Math.floor(quantidade) || 20, MAX_RESULTADOS));
  // deno-lint-ignore no-explicit-any
  const achados = new Map<string, any>();
  let token: string | undefined;
  while (achados.size < qtd) {
    // deno-lint-ignore no-explicit-any
    const corpo: any = { textQuery: termo, languageCode: "pt-BR", regionCode: "BR", pageSize: Math.min(20, qtd - achados.size) };
    if (token) corpo.pageToken = token;
    const dados = await postPlaces(apiKey, corpo);
    const lista = dados.places || [];
    for (const p of lista) if (p.id && !achados.has(p.id)) achados.set(p.id, normalizar(p, termo, tipo, c));
    token = dados.nextPageToken;
    if (!token || lista.length === 0) break;
    await espera(1500); // o token da próxima página leva um instante para valer
  }
  const empresas = [...achados.values()].filter((e) => e.status_negocio !== "CLOSED_PERMANENTLY").slice(0, qtd);
  return { termo, empresas };
}

// ------------------------------------------------------------------ Supabase (REST com o token do próprio usuário: o RLS vale)
export type Ctx = { url: string; apikey: string; auth: string };

const UFS_VALIDAS = new Set("AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" "));
function temCaractereDeControle(valor: string): boolean {
  for (const caractere of valor) {
    const codigo = caractere.codePointAt(0) || 0;
    if (codigo <= 31 || codigo === 127) return true;
  }
  return false;
}

export type EntradaBusca = { tipo: string; cidade: string; uf: string; bairro: string; quantidade: number };

export function validarEntradaBusca(corpo: unknown): EntradaBusca {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) throw new ErroBusca("Envie os filtros da busca em formato válido.");
  const dados = corpo as Record<string, unknown>;
  const texto = (campo: string, max: number, obrigatorio: boolean): string => {
    const valor = dados[campo];
    if (valor == null && !obrigatorio) return "";
    if (typeof valor !== "string") throw new ErroBusca(`O campo ${campo} deve ser texto.`);
    const limpo = valor.trim();
    if ((obrigatorio && limpo.length < 2) || limpo.length > max || temCaractereDeControle(limpo)) {
      throw new ErroBusca(`O campo ${campo} deve ter ${obrigatorio ? "2" : "0"} a ${max} caracteres válidos.`);
    }
    return limpo;
  };
  const tipo = texto("tipo", 100, true);
  const cidade = texto("cidade", 100, true);
  const uf = texto("uf", 2, true).toUpperCase();
  const bairro = texto("bairro", 100, false);
  if (!UFS_VALIDAS.has(uf)) throw new ErroBusca("Informe uma UF brasileira válida com duas letras.");
  let quantidade = 20;
  if (dados.quantidade !== undefined) {
    if (typeof dados.quantidade !== "number" || !Number.isInteger(dados.quantidade) || dados.quantidade < 1 || dados.quantidade > MAX_RESULTADOS) {
      throw new ErroBusca(`A quantidade deve ser um número inteiro entre 1 e ${MAX_RESULTADOS}.`);
    }
    quantidade = dados.quantidade;
  }
  return { tipo, cidade, uf, bairro, quantidade };
}

async function rest(ctx: Ctx, caminho: string, init: RequestInit = {}) {
  const r = await fetch(`${ctx.url}/rest/v1/${caminho}`, {
    ...init,
    headers: { apikey: ctx.apikey, Authorization: ctx.auth, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!r.ok) throw new ErroBusca(`Erro ao gravar no banco (${r.status}): ${await r.text()}`, 500);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

export async function usuarioAtual(ctx: Ctx): Promise<string> {
  const r = await fetch(`${ctx.url}/auth/v1/user`, { headers: { apikey: ctx.apikey, Authorization: ctx.auth } });
  if (!r.ok) throw new ErroBusca("Sessão inválida ou expirada. Entre novamente.", 401);
  const u = await r.json();
  if (!u?.id) throw new ErroBusca("Sessão inválida.", 401);
  return u.id;
}

const CAMPOS_BUSCA = ["place_id", "nome", "categoria", "nicho", "telefone", "celular", "whatsapp", "endereco", "bairro",
  "cidade", "uf", "maps_url", "site", "instagram", "facebook", "status_site", "nota", "avaliacoes", "qualificado",
  "motivo", "busca_termo"];

// deno-lint-ignore no-explicit-any
async function executarBuscaComUsuario(ctx: Ctx, apiKey: string, corpo: any, espera?: (ms: number) => Promise<unknown>, userIdInterno?: string) {
  const { tipo, cidade, uf, bairro, quantidade } = validarEntradaBusca(corpo);
  if (!apiKey) throw new ErroBusca("A chave GOOGLE_PLACES_API_KEY não foi configurada nos segredos das Edge Functions.", 500);

  const userId = userIdInterno || await usuarioAtual(ctx);
  const perfis = await rest(ctx, `perfis?select=nota_minima,avaliacoes_minimas&user_id=eq.${userId}`);
  const c: Criterios = {
    nota_minima: Number(perfis?.[0]?.nota_minima ?? 4.5),
    avaliacoes_minimas: Number(perfis?.[0]?.avaliacoes_minimas ?? 20),
  };

  const permitido = await rest(ctx, userIdInterno ? "rpc/limitar_busca_operacao" : "rpc/limitar_busca", {
    method: "POST",
    body: userIdInterno ? JSON.stringify({ p_user_id: userIdInterno }) : "{}",
  });
  if (permitido !== true) throw new ErroBusca("Limite de 5 buscas por minuto atingido. Aguarde um minuto e tente novamente.", 429);

  const { termo, empresas } = await pesquisarPlaces(apiKey, tipo, cidade, uf, bairro, quantidade, c, espera);

  let novos = 0;
  // deno-lint-ignore no-explicit-any
  let gravados: any[] = [];
  if (empresas.length) {
    const ids = empresas.map((e) => `"${e.place_id.replace(/"/g, "")}"`).join(",");
    const existentes = await rest(ctx, `leads?select=place_id&user_id=eq.${userId}&place_id=in.(${encodeURIComponent(ids)})`);
    const ja = new Set((existentes || []).map((x: { place_id: string }) => x.place_id));
    novos = empresas.filter((e) => !ja.has(e.place_id)).length;
    const linhas = empresas.map((e) => {
      // deno-lint-ignore no-explicit-any
      const l: any = { user_id: userId };
      for (const k of CAMPOS_BUSCA) l[k] = (e as Record<string, unknown>)[k];
      return l;
    });
    // merge-duplicates atualiza só estes campos: status, observações e mensagens que você já editou ficam intactos
    gravados = await rest(ctx, "leads?on_conflict=user_id,place_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(linhas),
    }) || [];
  }
  const qualificados = gravados.filter((g) => g.qualificado).length;
  await rest(ctx, "buscas", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, termo, resultados: gravados.length, novos, qualificados }),
  });
  gravados.sort((a, b) => Number(b.qualificado) - Number(a.qualificado) || (b.avaliacoes ?? 0) - (a.avaliacoes ?? 0));
  return { termo, total: gravados.length, novos, qualificados, leads: gravados };
}

export function executarBusca(ctx: Ctx, apiKey: string, corpo: unknown, espera?: (ms: number) => Promise<unknown>) {
  return executarBuscaComUsuario(ctx, apiKey, corpo, espera);
}

export function executarBuscaAgendada(ctx: Ctx, apiKey: string, userId: string, corpo: unknown) {
  if (!userId) throw new ErroBusca("Usuário inválido para busca agendada.", 400);
  return executarBuscaComUsuario(ctx, apiKey, corpo, undefined, userId);
}

// ------------------------------------------------------------------ servidor
export async function handler(req: Request, env: (k: string) => string | undefined): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (d: unknown, status = 200) =>
    new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ erro: "Use POST." }, 405);
  try {
    const auth = req.headers.get("Authorization") || "";
    if (!auth.startsWith("Bearer ")) throw new ErroBusca("Faça login para pesquisar.", 401);
    const ctx: Ctx = {
      url: env("SUPABASE_URL") || "",
      apikey: req.headers.get("apikey") || env("SUPABASE_ANON_KEY") || "",
      auth,
    };
    const corpo = await req.json().catch(() => ({}));
    return json(await executarBusca(ctx, env("GOOGLE_PLACES_API_KEY") || "", corpo));
  } catch (e) {
    const status = e instanceof ErroBusca ? e.status : 500;
    return json({ erro: e instanceof Error ? e.message : String(e) }, status);
  }
}

// deno-lint-ignore no-explicit-any
const D = (globalThis as any).Deno;
if (D?.serve && import.meta.main) D.serve((req: Request) => handler(req, (k) => D.env.get(k)));

