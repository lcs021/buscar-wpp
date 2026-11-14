// Cliente mínimo do Supabase (login, banco, funções) — sem dependências externas.
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

const URL_BASE = SUPABASE_URL.replace(/\/+$/, "");
const CHAVE_SESSAO = "lf_sessao";
let sessao = ler();

function ler() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null"); } catch { return null; }
}
function gravar(s) {
  sessao = s;
  try { s ? localStorage.setItem(CHAVE_SESSAO, JSON.stringify(s)) : localStorage.removeItem(CHAVE_SESSAO); } catch { /* modo privado */ }
}

async function erroDe(r) {
  let t = "";
  try { const j = await r.json(); t = j.msg || j.message || j.error_description || j.erro || j.error || JSON.stringify(j); }
  catch { t = r.statusText; }
  const e = new Error(t || `Erro ${r.status}`);
  e.status = r.status;
  return e;
}

async function tokenAuth(tipo, corpo) {
  const r = await fetch(`${URL_BASE}/auth/v1/token?grant_type=${tipo}`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(corpo),
  });
  if (!r.ok) throw await erroDe(r);
  const d = await r.json();
  gravar({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at, user: d.user });
  return sessao;
}

export const configurado = () => /^https:\/\//.test(URL_BASE) && SUPABASE_KEY && !SUPABASE_KEY.includes("COLE");
export const usuario = () => sessao?.user || null;

export async function entrar(email, senha) {
  try { return await tokenAuth("password", { email, password: senha }); }
  catch (e) { if (e.status === 400) e.message = "E-mail ou senha incorretos."; throw e; }
}

export function sair() {
  const t = sessao?.access_token;
  gravar(null);
  if (t) fetch(`${URL_BASE}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${t}` } }).catch(() => {});
}

let renovando = null;
async function token() {
  if (!sessao) throw Object.assign(new Error("Faça login."), { status: 401 });
  const agora = Math.floor(Date.now() / 1000);
  if (sessao.expires_at && sessao.expires_at - agora < 60) {
    renovando ||= tokenAuth("refresh_token", { refresh_token: sessao.refresh_token }).finally(() => (renovando = null));
    try { await renovando; } catch { gravar(null); throw Object.assign(new Error("Sessão expirada. Entre de novo."), { status: 401 }); }
  }
  return sessao.access_token;
}

async function cabecalhos(extra = {}) {
  return { apikey: SUPABASE_KEY, Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...extra };
}

// db("leads?select=*&order=created_at.desc") / db("leads?id=eq.x", {method:"PATCH", body:{...}})
export async function db(caminho, { method = "GET", body, prefer } = {}) {
  const h = await cabecalhos(prefer ? { Prefer: prefer } : method !== "GET" ? { Prefer: "return=representation" } : {});
  const r = await fetch(`${URL_BASE}/rest/v1/${caminho}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { gravar(null); location.reload(); }
  if (!r.ok) throw await erroDe(r);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

export async function funcao(nome, corpo) {
  const r = await fetch(`${URL_BASE}/functions/v1/${nome}`, { method: "POST", headers: await cabecalhos(), body: JSON.stringify(corpo) });
  if (!r.ok) {
    const e = await erroDe(r);
    if (r.status === 404) e.message = "A função 'buscar-empresas' não foi encontrada. Faça o deploy dela no Supabase (veja o README).";
    throw e;
  }
  return r.json();
}

// Chamada pública (sem login) usada pela página do site demo
export async function rpcPublica(nome, args) {
  const r = await fetch(`${URL_BASE}/rest/v1/rpc/${nome}`, {
    method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify(args),
  });
  if (!r.ok) throw await erroDe(r);
  return r.json();
}
