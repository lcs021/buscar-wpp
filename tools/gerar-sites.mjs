// Gera um arquivo de site por lead em web/s/<slug>/index.html e o SQL que grava o endereço em leads.site_demo.
// Uso:  node tools/gerar-sites.mjs leads.json [https://lcs021.github.io/buscar-wpp/]
//   leads.json = lista de leads (export do painel ou consulta do Supabase) com pelo menos: slug, nome, nicho.
// Sem login e sem senha: usa só a URL e a chave pública que já estão em web/config.js.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
globalThis.location ??= { href: "https://localhost/" };
const { renderSite } = await import(path.join(raiz, "web/site-render.js"));
const { SUPABASE_URL, SUPABASE_KEY } = await import(path.join(raiz, "web/config.js"));

const [arquivo, base = "https://lcs021.github.io/buscar-wpp/"] = process.argv.slice(2);
if (!arquivo) { console.error("Uso: node tools/gerar-sites.mjs leads.json [url-base]"); process.exit(1); }
const leads = JSON.parse(await readFile(arquivo, "utf8"));
const sql = [];
let feitos = 0;
for (const l of leads) {
  if (!/^[a-z0-9]{8,}$/i.test(l.slug || "") || !l.nome) { console.error("pulado (sem slug ou nome):", l.nome || l.slug); continue; }
  const url = new URL(`s/${l.slug}/`, base).href;
  const pasta = path.join(raiz, "web/s", l.slug);
  await mkdir(pasta, { recursive: true });
  await writeFile(path.join(pasta, "index.html"), renderSite(l, { url, supabase: { url: SUPABASE_URL, chave: SUPABASE_KEY } }));
  sql.push(`update public.leads set site_demo = '${url}' where slug = '${l.slug}';`);
  feitos++;
}
await writeFile(path.join(raiz, "tools/site_demo.sql"), sql.join("\n") + "\n");
console.log(`${feitos} sites em web/s/. SQL para ligar ao painel: tools/site_demo.sql`);
