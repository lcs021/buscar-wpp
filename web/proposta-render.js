// Página de proposta comercial: mesma identidade visual do site demo da empresa.
import { esc, notaBR, milhar, digitos, nomeCurto, TEMAS } from "./shared.js";
import { temaVisual } from "./demo-render.js";

export const PLANOS_PADRAO = [
  { nome: "Essencial", preco: 497, parcelas: "ou 3x de R$ 175", prazo: "5 dias úteis", destaque: false,
    itens: ["Site de uma página com a cara do seu negócio", "Suas fotos, serviços e preços", "Botão direto para o WhatsApp", "Mapa e endereço", "Funciona bem no celular", "Publicação incluída"] },
  { nome: "Profissional", preco: 897, parcelas: "ou 3x de R$ 315", prazo: "7 dias úteis", destaque: true,
    itens: ["Tudo do Essencial", "Domínio próprio .com.br por 1 ano", "Galeria de fotos e cardápio/tabela completa", "Ajuste do seu perfil no Google", "2 rodadas de ajustes"] },
  { nome: "Manutenção mensal", preco: 59, parcelas: "por mês (opcional)", prazo: "", destaque: false,
    itens: ["Site sempre no ar", "Troca de textos, preços e fotos", "Suporte pelo WhatsApp"] },
];

export const reais = (n) => "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: Number(n) % 1 ? 2 : 0, maximumFractionDigits: 2 });

const MOTIVO = {
  sem_site: "Hoje a ficha de vocês no Google não tem site.",
  instagram: "Hoje o botão “Site” da ficha de vocês no Google leva só para o Instagram.",
  facebook: "Hoje o botão “Site” da ficha de vocês no Google leva só para o Facebook.",
  whatsapp: "Hoje o botão “Site” da ficha de vocês no Google leva só para o WhatsApp.",
  link_agregador: "Hoje o link da ficha de vocês no Google vai direto para um app de pedido ou agenda, sem uma página da marca.",
  com_site: "Dá para deixar a presença de vocês na internet mais forte no celular.",
};

const check = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const zap = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>';

export function renderProposta(p, { linkDemo = "", linkProposta = "" } = {}) {
  const d = temaVisual(p.nicho);
  const t = TEMAS[p.nicho] || TEMAS.generico;
  const v = p.vendedor || {};
  const planos = Array.isArray(v.planos) && v.planos.length ? v.planos : PLANOS_PADRAO;
  const nome = nomeCurto(p.nome);
  const zapV = digitos(v.whatsapp);
  const numV = zapV ? (zapV.startsWith("55") ? zapV : "55" + zapV) : "";
  const quero = (pl) => `https://wa.me/${numV}?text=${encodeURIComponent(`Olá${v.nome ? " " + v.nome : ""}! Vi a proposta para ${nome} e quero o plano ${pl.nome} (${reais(pl.preco)}). ${linkProposta}`)}`;
  const temNota = p.nota != null && p.avaliacoes;
  const prazoTop = planos.find((x) => x.prazo)?.prazo || "";
  const caixa = d.caixaAlta ? "text-transform:uppercase;" : "";

  const cards = planos.map((pl) => `
    <article class="plano${pl.destaque ? " dest" : ""}">
      ${pl.destaque ? `<p class="rec">Recomendado</p>` : ""}
      <h3>${esc(pl.nome)}</h3>
      <p class="preco"><b>${reais(pl.preco)}</b><span>${esc(pl.parcelas || "")}</span></p>
      ${pl.prazo ? `<p class="prazo">Entrega em ${esc(pl.prazo)}</p>` : ""}
      <ul>${(pl.itens || []).filter(Boolean).map((i) => `<li>${check}<span>${esc(i)}</span></li>`).join("")}</ul>
      ${numV ? `<a class="btn ${pl.destaque ? "cheio" : "linha"}" href="${esc(quero(pl))}">${zap} Escolher este plano</a>` : ""}
    </article>`).join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proposta para ${esc(nome)}</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="${d.marca}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${d.fontes}" rel="stylesheet">
<style>
:root{--papel:${d.papel};--tinta:${d.tinta};--marca:${d.marca};--marca-txt:${d.marcaTxt};--acento:${d.acento};--suave:${d.suave};--tit:${d.titulo};--corpo:${d.corpo}}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--papel);color:var(--tinta);font:17px/1.6 var(--corpo);-webkit-font-smoothing:antialiased}
a{color:inherit}:focus-visible{outline:3px solid var(--acento);outline-offset:3px}
h1,h2,h3{font-family:var(--tit);line-height:1.05;margin:0;overflow-wrap:break-word;${d.larguraTitulo || ""}}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.topo{background:var(--marca);color:var(--marca-txt);padding:56px 0 64px}
.topo .wrap{display:grid;grid-template-columns:1.2fr .8fr;gap:40px;align-items:center}
.de{margin:0 0 14px;font-size:15px;opacity:.8}
.topo h1{font-size:clamp(40px,7vw,84px);${caixa}}
.topo .sub{font-size:19px;max-width:36ch;margin:18px 0 0;opacity:.92}
.celular{justify-self:center;width:250px;height:470px;border-radius:30px;border:9px solid #141414;overflow:hidden;background:#fff;box-shadow:0 30px 60px -25px rgba(0,0,0,.6);position:relative}
.celular iframe{width:390px;height:733px;border:0;transform:scale(.595);transform-origin:0 0;pointer-events:none}
.celular a{position:absolute;inset:0}
.ver{display:block;text-align:center;margin-top:14px;font-size:15px;color:var(--marca-txt)}
section{padding:64px 0}
h2{font-size:clamp(28px,4.4vw,42px);margin-bottom:20px;${caixa}}
.porque p{font-size:19px;max-width:60ch;margin:0 0 12px}
.porque .prova{color:var(--suave);font-size:17px}
.planos{display:grid;grid-template-columns:repeat(${Math.min(planos.length, 3)},1fr);gap:16px;align-items:stretch}
.plano{display:flex;flex-direction:column;background:#fff;color:#1d1d1d;border:1px solid color-mix(in srgb,var(--tinta) 16%,transparent);border-radius:14px;padding:26px 22px}
.plano.dest{border:2px solid var(--marca);box-shadow:0 24px 50px -30px color-mix(in srgb,var(--marca) 80%,transparent)}
.rec{margin:0 0 10px;align-self:flex-start;background:var(--marca);color:var(--marca-txt);font-size:13px;font-weight:600;padding:3px 10px;border-radius:999px}
.plano h3{font-size:26px;${caixa}}
.preco{margin:12px 0 2px;display:flex;flex-direction:column}.preco b{font-family:var(--tit);font-size:44px;line-height:1.05;color:var(--marca)}.preco span{font-size:15px;color:#666}
.prazo{margin:6px 0 0;font-size:15px;color:#444}
.plano ul{list-style:none;margin:18px 0 22px;padding:0;flex:1}
.plano li{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:16px}.plano li svg{flex:none;margin-top:4px;color:var(--marca)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 20px;border-radius:999px;font-weight:600;text-decoration:none}
.btn.cheio{background:var(--marca);color:var(--marca-txt)}.btn.linha{border:2px solid var(--marca);color:var(--marca)}
.passos{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:20px;counter-reset:p}
.passos li{counter-increment:p;border-top:3px solid var(--marca);padding-top:14px}
.passos li::before{content:counter(p);font-family:var(--tit);font-size:30px;color:var(--marca);display:block;line-height:1;margin-bottom:6px}
.passos b{display:block;font-size:18px}.passos span{color:var(--suave);font-size:15px}
.cond{background:color-mix(in srgb,var(--tinta) 5%,var(--papel));border-radius:14px;padding:24px;font-size:16px}
.cond p{margin:0 0 8px}.cond p:last-child{margin:0}
footer{text-align:center;padding:36px 20px 60px;color:var(--suave);font-size:15px}
@media (max-width:820px){
  .topo .wrap{grid-template-columns:1fr}.planos{grid-template-columns:1fr}.passos{grid-template-columns:1fr 1fr}
  .celular{width:220px;height:414px}.celular iframe{transform:scale(.523)}
  section{padding:48px 0}
}
</style></head><body>
<header class="topo"><div class="wrap">
  <div>
    <p class="de">Proposta${v.nome ? ` de ${esc(v.nome)}` : ""}</p>
    <h1>Site profissional para ${esc(nome)}</h1>
    <p class="sub">Um site com a cara de vocês, feito para quem procura ${esc(t.rotulo.toLowerCase())}${p.bairro ? ` em ${esc(p.bairro)}` : ""} no Google e no celular.</p>
  </div>
  ${linkDemo ? `<div><div class="celular"><iframe src="${esc(linkDemo)}&p=1" title="Modelo do site" loading="lazy" tabindex="-1"></iframe><a href="${esc(linkDemo)}" target="_blank" rel="noopener" aria-label="Abrir o modelo do site"></a></div><a class="ver" href="${esc(linkDemo)}" target="_blank" rel="noopener">Abrir o modelo do site</a></div>` : ""}
</div></header>
<main>
  <section class="porque"><div class="wrap">
    <h2>Por que vale a pena</h2>
    <p>${esc(MOTIVO[p.status_site] || MOTIVO.sem_site)} Quem pesquisa e não encontra uma página clara, com fotos, serviços e um botão de WhatsApp, costuma ir para o próximo resultado.</p>
    ${temNota ? `<p class="prova">Vocês já têm nota ${notaBR(p.nota)} com ${milhar(p.avaliacoes)} avaliações no Google. O site faz essa reputação trabalhar a favor de vocês.</p>` : ""}
  </div></section>
  <section><div class="wrap">
    <h2>Planos</h2>
    <div class="planos">${cards}</div>
    ${numV ? "" : `<p class="prova">Para contratar, responda a mensagem em que você recebeu esta proposta.</p>`}
  </div></section>
  <section><div class="wrap">
    <h2>Como funciona</h2>
    <ol class="passos">
      <li><b>Você escolhe o plano</b><span>Pelo botão acima ou respondendo a mensagem.</span></li>
      <li><b>Manda o material</b><span>Logo, fotos, serviços, preços e horários.</span></li>
      <li><b>Recebe o site pronto</b><span>${prazoTop ? `Em até ${esc(prazoTop)}, ` : ""}para aprovar e pedir ajustes.</span></li>
      <li><b>Site no ar</b><span>Publicado e com o link no seu perfil do Google.</span></li>
    </ol>
  </div></section>
  <section><div class="wrap"><div class="cond">
    ${v.condicoes ? `<p>${esc(v.condicoes)}</p>` : ""}
    <p>Proposta válida por ${Number(v.validade_dias) || 7} dias.</p>
  </div></div></section>
</main>
<footer>Proposta para ${esc(nome)}${v.nome ? ` · ${esc(v.nome)}` : ""}${numV ? ` · <a href="https://wa.me/${numV}">${esc(v.whatsapp)}</a>` : ""}</footer>
</body></html>`;
}
