// Site cinematográfico por empresa (padrão "Site de 10K", sem vídeo):
//   a abertura é uma cena presa na tela que avança e volta com a rolagem (três fotos, três legendas, um quadro final),
//   e a página assenta no site de verdade logo abaixo (as mesmas seções por ramo do demo-render.js).
//   Roda igual no celular e no computador. Nada é inventado: nota, avaliações, endereço e telefone vêm da ficha pública.
import { svg, esc, notaBR, milhar } from "./shared.js";
import { _pecas } from "./demo-render.js";

const { dados, img, botao, estrelas, montar, css, SCRIPT, jsonLD } = _pecas;

// ---------------------------------------------------------------- abertura guiada pela rolagem
function heroCinema(x, l) {
  const { t } = x;
  const alt = `${t.rotulo} (foto ilustrativa)`;
  const quadro = (id, n) => `<figure class="cf cf${n}">${img(id, alt, { larg: 1100, sizes: "100vw", prioridade: n === 1, w: 1600, h: 1000 })}</figure>`;
  return `<section class="cine" aria-label="Abertura">
  <div class="cine-palco">
    <div class="cine-fotos">${quadro(x.ids[0], 1)}${quadro(x.ids[1], 2)}${quadro(x.ids[2], 3)}</div>
    <div class="cine-veu" aria-hidden="true"></div>
    <div class="cine-linha" aria-hidden="true"><i></i><b></b></div>
    <div class="cine-txt">
      <div class="leg l1">
        <p class="kicker">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
        <h1 ${x.h1}>${esc(x.nome)}</h1>
      </div>
      <div class="leg l2" aria-hidden="true"><p class="frase">${esc(t.chamada)}</p></div>
      <div class="leg l3">
        ${x.temNota ? `<p class="placar"><b>${notaBR(l.nota)}</b><span>${estrelas(l.nota)}<em>${milhar(l.avaliacoes)} avaliações no Google</em></span></p>` : `<p class="frase">${esc(x.f.titulo)}</p>`}
        <div class="acoes">${botao(x, "acento")}<a class="btn contorno claro" href="#servicos">Ver ${esc(x.r.tServ.toLowerCase())}</a></div>
      </div>
    </div>
    <span class="tag-foto">Fotos ilustrativas</span>
    <div class="cine-rola" aria-hidden="true"><i></i>Role para ver</div>
    <div class="cine-barra" aria-hidden="true"><i></i></div>
  </div>
</section>`;
}

// ---------------------------------------------------------------- estilo da abertura e detalhes que correm pela página
const CSS_CINE = `
/* sem JavaScript ou com movimento reduzido: abertura parada, completa e legível */
.cine{position:relative;background:#111}
.cine-palco{position:relative;min-height:min(88svh,780px);overflow:hidden;display:flex;align-items:flex-end;color:#fff}
.cine-fotos,.cf,.cine-veu{position:absolute;inset:0;margin:0}
.cf img{width:100%;height:100%;object-fit:cover}
.cf2,.cf3{display:none}
.cine-veu{background:linear-gradient(180deg,rgba(0,0,0,.34) 0%,rgba(0,0,0,.08) 34%,rgba(0,0,0,.62) 70%,rgba(0,0,0,.9) 100%)}
.cine-linha{position:absolute;inset:14px;pointer-events:none;display:none;z-index:1}
.cine-linha i,.cine-linha b{position:absolute;background:var(--acento)}
.cine-linha i{left:0;right:0;bottom:0;height:2px;transform-origin:left;transform:scaleX(min(1,calc(var(--p,0) * 2)))}
.cine-linha b{right:0;top:0;bottom:0;width:2px;transform-origin:bottom;transform:scaleY(clamp(0,calc(var(--p,0) * 2 - 1),1))}
.cine-txt{position:relative;z-index:2;width:100%;max-width:var(--max);margin:0 auto;padding:110px 22px 64px}
.leg{container-type:inline-size;max-width:760px}
.leg.l2{display:none}
.leg.l3{margin-top:24px}.leg.l3 .frase{margin-bottom:22px}
.cine .kicker{color:#fff;opacity:.9;letter-spacing:.04em}
.cine h1{color:#fff;--hmax:112px;text-shadow:0 2px 30px rgba(0,0,0,.45)}
.frase{font-family:var(--tit);font-size:clamp(30px,6.4vw,68px);line-height:1.04;max-width:16ch;text-wrap:balance;text-shadow:0 2px 30px rgba(0,0,0,.5)}
.placar{display:flex;align-items:center;gap:16px;margin-bottom:22px}
.placar b{font-family:var(--tit);font-size:clamp(56px,11vw,104px);line-height:.9;color:var(--acento)}
.placar>span{display:grid;gap:6px}.placar em{font-style:normal;font-size:16px;font-weight:500}
.placar .estrelas i{color:rgba(255,255,255,.3)}.placar .estrelas i.on{color:#F5B93A}
.cine .tag-foto{z-index:3;right:24px;top:24px;bottom:auto}
.cine-rola,.cine-barra{display:none}

/* com rolagem viva: a cena fica presa e avança com o dedo */
.cine.vivo{height:340svh}
.cine.vivo .cine-palco{position:sticky;top:var(--topo,67px);height:calc(100svh - var(--topo,67px));min-height:0}
.cine.vivo .cf{display:block;will-change:transform,clip-path}
.cine.vivo .cf1{transform:scale(calc(1.04 + var(--p,0) * .16))}
.cine.vivo .cf2{clip-path:inset(calc((1 - var(--a,0)) * 100%) 0 0 0);transform:scale(calc(1.14 - var(--a,0) * .1))}
.cine.vivo .cf3{clip-path:inset(0 0 0 calc((1 - var(--b,0)) * 100%));transform:scale(calc(1.14 - var(--b,0) * .1))}
.cine.vivo .cine-linha{display:block}
.cine.vivo .cine-txt{position:absolute;inset:0;padding:0;max-width:none}
.cine.vivo .leg{display:block;position:absolute;left:max(22px,calc((100% - var(--max)) / 2 + 22px));right:22px;bottom:clamp(64px,11svh,120px);margin:0;opacity:0;transform:translateY(22px);transition:opacity .55s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1);pointer-events:none}
.cine.vivo .leg.on{opacity:1;transform:none;pointer-events:auto}
.cine.vivo .leg.foi{transform:translateY(-22px)}
.cine.vivo .cine-rola{display:flex;align-items:center;gap:10px;position:absolute;z-index:3;left:50%;bottom:56px;transform:translateX(-50%);font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:calc(1 - var(--p,0) * 14);transition:opacity .3s}
.cine-rola i{width:1px;height:26px;background:#fff;transform-origin:top;animation:pulsa 1.8s ease-in-out infinite}
@keyframes pulsa{0%{transform:scaleY(0)}55%{transform:scaleY(1)}100%{transform:scaleY(1);opacity:0}}
.cine.vivo .cine-barra{display:block;position:absolute;z-index:3;left:0;right:0;top:0;height:3px;background:rgba(255,255,255,.16)}
.cine-barra i{display:block;height:100%;background:var(--acento);transform-origin:left;transform:scaleX(var(--p,0))}

/* detalhes que correm pela página: o traço do título se desenha quando a seção entra */
.sec h2{position:relative;padding-bottom:16px}
.sec h2::after{content:"";position:absolute;left:0;bottom:0;width:72px;height:3px;background:var(--acento);transform-origin:left}
@media (prefers-reduced-motion:no-preference){
  .js .rev h2::after{transform:scaleX(0);transition:transform .9s .25s cubic-bezier(.2,.7,.2,1)}
  .js .rev.on h2::after{transform:none}
  .foto img{transition:transform .8s cubic-bezier(.2,.7,.2,1)}.foto:hover img{transform:scale(1.04)}
}
@media (max-width:860px){
  .cine.vivo{height:300svh}
  .cine-txt{padding:90px 20px 56px}
  .cine.vivo .leg{left:20px;right:20px;bottom:74px}
  .cine .acoes .btn{flex:1 1 100%}
}
`;

// Um laço que só trabalha quando a rolagem muda: suaviza o avanço e escreve na página apenas quando o valor muda.
const SCRIPT_CINE = `
(function(){
  var c=document.querySelector('.cine');if(!c)return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  if(!(window.CSS&&CSS.supports&&CSS.supports('height','1svh')&&CSS.supports('clip-path','inset(1% 0 0 0)')))return;
  var topo=document.querySelector('.topo'),palco=c.querySelector('.cine-palco'),legs=[].slice.call(c.querySelectorAll('.leg'));
  var faixas=[[-1,.26],[.34,.6],[.7,2]],alvo=0,atual=-1,rodando=false,estado=[];
  function medir(){c.style.setProperty('--topo',(topo?topo.offsetHeight:0)+'px')}
  function ler(){var r=c.getBoundingClientRect(),t=topo?topo.offsetHeight:0,total=c.offsetHeight-palco.offsetHeight;alvo=total>0?Math.min(1,Math.max(0,(t-r.top)/total)):0}
  function faixa(p,de,ate){return Math.min(1,Math.max(0,(p-de)/(ate-de)))}
  function pintar(p){
    c.style.setProperty('--p',p.toFixed(4));
    c.style.setProperty('--a',faixa(p,.24,.46).toFixed(4));
    c.style.setProperty('--b',faixa(p,.56,.78).toFixed(4));
    for(var i=0;i<legs.length;i++){var e=p>=faixas[i][0]&&p<faixas[i][1]?'on':p>=faixas[i][1]?'foi':'';
      if(estado[i]!==e){estado[i]=e;legs[i].classList.toggle('on',e==='on');legs[i].classList.toggle('foi',e==='foi')}}
  }
  function passo(){
    var d=alvo-atual;
    if(Math.abs(d)<.0006){atual=alvo;pintar(atual);rodando=false;return}
    atual+=d*.14;pintar(atual);requestAnimationFrame(passo)
  }
  function acordar(){ler();if(!rodando){rodando=true;requestAnimationFrame(passo)}}
  c.classList.add('vivo');medir();ler();atual=alvo;pintar(atual);
  addEventListener('scroll',acordar,{passive:true});
  addEventListener('resize',function(){medir();acordar()});
})();`;

// Conta a visualização no painel quando a página é um arquivo publicado (o site.html já conta ao buscar os dados).
// Se o lead foi excluído ou o site foi tirado do ar no painel, o arquivo publicado também deixa de mostrar o site.
const contador = (slug, sb) => `
(function(){try{var prev=/[?&]p(=|&|$)/.test(location.search);
  fetch(${JSON.stringify(sb.url.replace(/\/+$/, "") + "/rest/v1/rpc/demo_publica")},{method:'POST',headers:{apikey:${JSON.stringify(sb.chave)},'Content-Type':'application/json'},body:JSON.stringify({p_slug:${JSON.stringify(slug)},p_contar:!prev})})
  .then(function(r){return r.ok?r.json():undefined}).then(function(d){if(d===null&&!prev){document.title='Site indisponível';document.body.innerHTML='<main style="min-height:100vh;display:grid;place-items:center;padding:24px;font:17px/1.5 system-ui,sans-serif;text-align:center;color:#333;background:#f5f5f3"><div><h1 style="font-size:24px;margin:0 0 8px">Este site não está mais disponível</h1><p style="margin:0">O link de demonstração foi desativado.</p></div></main>';}}).catch(function(){})
}catch(e){}})();`;

// renderSite(lead)                       -> página gerada na hora (site.html?s=<slug> e pré-visualização do painel)
// renderSite(lead, { url, supabase })    -> arquivo publicado: ganha prévia de link (WhatsApp) e conta as visualizações
export function renderSite(l, { preview = false, url = "", supabase = null } = {}) {
  const x = dados(l);
  const titulo = `${x.nome} | ${x.t.rotulo}${l.bairro ? ` em ${l.bairro}` : ""}`;
  const desc = `${x.t.rotulo}${x.lugar ? ` em ${x.lugar}` : ""}. ${x.t.chamada}${x.temNota ? ` Nota ${notaBR(l.nota)} no Google.` : ""}`;
  const og = url ? `<meta property="og:type" content="website"><meta property="og:url" content="${esc(url)}"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(desc)}"><link rel="canonical" href="${esc(url)}">` : "";
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(desc)}"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="${x.d.marca}">${og}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://images.unsplash.com">
<link href="${x.d.fontes}" rel="stylesheet">
<style>${css(x)}${CSS_CINE}</style>
<script type="application/ld+json">${jsonLD(x, l)}</script></head>
<body class="seg-${esc(l.nicho || "generico")} cinema">
<div class="demo-aviso"><b>Demonstração</b> criada para ${esc(x.nome)}. Não é o site oficial.${preview ? " (pré-visualização)" : ""}</div>
${montar(x, l, heroCinema)}
<script>${SCRIPT}${SCRIPT_CINE}${supabase && l.slug ? contador(l.slug, supabase) : ""}</script>
</body></html>`;
}
