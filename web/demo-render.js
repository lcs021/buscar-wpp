// Sites demo: um layout por família de nicho, com tipografia e paleta próprias.
//   placa   -> barbearia, hamburgueria, pizzaria, açaí, padaria, restaurante (letreiro + quadro de cardápio)
//   oficina -> oficina, estética automotiva (ordem de serviço)
//   agenda  -> salão, manicure, dentista, clínica, pet (cartão de agendamento)
//   vitrine -> loja, academia, demais (vitrine)
import { TEMAS, svg, esc, digitos, notaBR, milhar, numeroWhats, linkMaps, nomeCurto, iniciais } from "./shared.js";

const F = (familias) => "https://fonts.googleapis.com/css2?" + familias.map((f) => "family=" + f).join("&") + "&display=swap";

// ---------------------------------------------------------------- direção de arte por nicho
const D = {
  barbearia: {
    familia: "placa", fontes: F(["Big+Shoulders+Display:wght@700;900", "Work+Sans:wght@400;500;600"]),
    titulo: "'Big Shoulders Display', Impact, sans-serif", corpo: "'Work Sans', system-ui, sans-serif", caixaAlta: true,
    papel: "#EFE8DC", tinta: "#1F1814", marca: "#5B1A1A", marcaTxt: "#F4EADB", acento: "#C29A5B", suave: "#6F6157",
    padrao: "repeating-linear-gradient(-45deg,#5B1A1A 0 22px,#EFE8DC 22px 44px,#2B3A55 44px 66px,#EFE8DC 66px 88px)",
    quadro: "Tabela da casa",
  },
  hamburgueria: {
    familia: "placa", fontes: F(["Bowlby+One", "Work+Sans:wght@400;500;600"]),
    titulo: "'Bowlby One', Impact, sans-serif", corpo: "'Work Sans', system-ui, sans-serif", caixaAlta: true,
    papel: "#F6E7C8", tinta: "#2A1A12", marca: "#C8261C", marcaTxt: "#FFF3DC", acento: "#F2B705", suave: "#6E5643",
    padrao: "radial-gradient(#F2B705 22%,transparent 23%) 0 0/26px 26px, #C8261C",
    quadro: "Cardápio",
  },
  pizzaria: {
    familia: "placa", fontes: F(["Fraunces:opsz,wght@9..144,700;9..144,900", "Karla:wght@400;500;700"]),
    titulo: "'Fraunces', Georgia, serif", corpo: "'Karla', system-ui, sans-serif",
    papel: "#F7EEDC", tinta: "#2B1D14", marca: "#B5301F", marcaTxt: "#FFF4E2", acento: "#2F5D3A", suave: "#6E5A48",
    padrao: "repeating-linear-gradient(0deg,rgba(181,48,31,.85) 0 18px,transparent 18px 36px),repeating-linear-gradient(90deg,rgba(181,48,31,.55) 0 18px,#F7EEDC 18px 36px)",
    quadro: "Cardápio",
  },
  acai: {
    familia: "placa", fontes: F(["Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800"]),
    titulo: "'Bricolage Grotesque', system-ui, sans-serif", corpo: "'Bricolage Grotesque', system-ui, sans-serif",
    papel: "#FBF4FF", tinta: "#26092E", marca: "#3B0F45", marcaTxt: "#FBF4FF", acento: "#F4D35E", suave: "#6D5577",
    padrao: "radial-gradient(circle at 30% 30%,#6B2A7A 0 18%,transparent 19%) 0 0/48px 48px,radial-gradient(circle at 70% 70%,#F4D35E 0 9%,transparent 10%) 0 0/48px 48px,#3B0F45",
    quadro: "Monte o seu",
  },
  padaria: {
    familia: "placa", fontes: F(["Young+Serif", "Karla:wght@400;500;700"]),
    titulo: "'Young Serif', Georgia, serif", corpo: "'Karla', system-ui, sans-serif",
    papel: "#FBF7F0", tinta: "#3A2618", marca: "#8C4F1C", marcaTxt: "#FBF1DF", acento: "#E6B861", suave: "#7A6450",
    padrao: "radial-gradient(ellipse 10px 5px at 50% 50%,#E6B861 60%,transparent 62%) 0 0/34px 22px,#8C4F1C",
    quadro: "No balcão",
  },
  restaurante: {
    familia: "placa", fontes: F(["Fraunces:opsz,wght@9..144,600;9..144,800", "Karla:wght@400;500;700"]),
    titulo: "'Fraunces', Georgia, serif", corpo: "'Karla', system-ui, sans-serif",
    papel: "#F5F0E6", tinta: "#26221C", marca: "#4E4E28", marcaTxt: "#F5F0E6", acento: "#C2502E", suave: "#6B6455",
    padrao: "repeating-linear-gradient(45deg,#4E4E28 0 2px,transparent 2px 14px),#E9E1CF",
    quadro: "Cardápio",
  },
  oficina: {
    familia: "oficina", fontes: F(["Barlow+Condensed:wght@600;800", "Barlow:wght@400;500;600"]),
    titulo: "'Barlow Condensed', Impact, sans-serif", corpo: "'Barlow', system-ui, sans-serif", caixaAlta: true,
    papel: "#E7E5E0", tinta: "#22262A", marca: "#22262A", marcaTxt: "#F2F1EE", acento: "#F2B200", suave: "#5C6166",
    padrao: "linear-gradient(#22262A22 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,#22262A22 1px,transparent 1px) 0 0/24px 24px,#D6D3CC",
    quadro: "Ordem de serviço",
  },
  estetica_auto: {
    familia: "oficina", fontes: F(["Barlow+Condensed:wght@600;800", "Barlow:wght@400;500;600"]),
    titulo: "'Barlow Condensed', Impact, sans-serif", corpo: "'Barlow', system-ui, sans-serif", caixaAlta: true,
    papel: "#F2F5F8", tinta: "#0E2A47", marca: "#0E2A47", marcaTxt: "#EAF2FA", acento: "#1E9BD7", suave: "#566B80",
    padrao: "radial-gradient(circle at 50% 40%,#ffffffcc 0 6%,transparent 7%) 0 0/38px 38px,radial-gradient(circle at 20% 80%,#ffffff88 0 4%,transparent 5%) 0 0/29px 29px,linear-gradient(160deg,#1E9BD7,#0E2A47)",
    quadro: "Pacotes de cuidado",
  },
  salao: {
    familia: "agenda", fontes: F(["Cormorant+Garamond:wght@500;600;700", "Jost:wght@400;500"]),
    titulo: "'Cormorant Garamond', Georgia, serif", corpo: "'Jost', system-ui, sans-serif",
    papel: "#FBF8F5", tinta: "#2E1A26", marca: "#4A2338", marcaTxt: "#FBF1F4", acento: "#B98068", suave: "#7B6670",
    padrao: "radial-gradient(circle at 0 100%,transparent 38%,#E9CFC6 39% 41%,transparent 42%) 0 0/60px 60px,#F3E3DE",
  },
  manicure: {
    familia: "agenda", fontes: F(["Cormorant+Garamond:wght@500;600;700", "Jost:wght@400;500"]),
    titulo: "'Cormorant Garamond', Georgia, serif", corpo: "'Jost', system-ui, sans-serif",
    papel: "#FCF7F4", tinta: "#2B1218", marca: "#A3142E", marcaTxt: "#FFF2F2", acento: "#D9A7A0", suave: "#7D6064",
    padrao: "radial-gradient(ellipse 9px 14px at 50% 50%,#A3142E 60%,transparent 63%) 0 0/36px 40px,#EAD7CC",
  },
  dentista: {
    familia: "agenda", fontes: F(["Manrope:wght@400;500;700;800"]),
    titulo: "'Manrope', system-ui, sans-serif", corpo: "'Manrope', system-ui, sans-serif",
    papel: "#FFFFFF", tinta: "#12302E", marca: "#0F6E68", marcaTxt: "#F1FBF8", acento: "#7FD1C1", suave: "#4F6B68",
    padrao: "linear-gradient(#0F6E6814 2px,transparent 2px) 0 0/30px 30px,linear-gradient(90deg,#0F6E6814 2px,transparent 2px) 0 0/30px 30px,#D9F0EA",
  },
  clinica: {
    familia: "agenda", fontes: F(["Manrope:wght@400;500;700;800"]),
    titulo: "'Manrope', system-ui, sans-serif", corpo: "'Manrope', system-ui, sans-serif",
    papel: "#FFFFFF", tinta: "#173A2C", marca: "#1F4D3A", marcaTxt: "#F1F7F3", acento: "#9BC4AE", suave: "#55705F",
    padrao: "radial-gradient(circle,#1F4D3A1f 2px,transparent 3px) 0 0/22px 22px,#DCE7DF",
  },
  pet: {
    familia: "agenda", fontes: F(["Baloo+2:wght@600;800", "Nunito:wght@400;600;700"]),
    titulo: "'Baloo 2', system-ui, sans-serif", corpo: "'Nunito', system-ui, sans-serif",
    papel: "#F6FAFD", tinta: "#1B2B33", marca: "#2E8B57", marcaTxt: "#F2FBF5", acento: "#FFC94A", suave: "#55707C",
    padrao: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 24 24'%3E%3Cg fill='%232E8B57' fill-opacity='.22'%3E%3Ccircle cx='5.5' cy='10' r='2'/%3E%3Ccircle cx='9.5' cy='5.5' r='2'/%3E%3Ccircle cx='14.5' cy='5.5' r='2'/%3E%3Ccircle cx='18.5' cy='10' r='2'/%3E%3Cpath d='M12 12c-3 0-6 4-6 6.5S8 21 12 21s6-.5 6-2.5S15 12 12 12z'/%3E%3C/g%3E%3C/svg%3E\") 0 0/56px 56px,#E8F4FB",
  },
  loja: {
    familia: "vitrine", fontes: F(["DM+Serif+Display", "DM+Sans:wght@400;500;700"]),
    titulo: "'DM Serif Display', Georgia, serif", corpo: "'DM Sans', system-ui, sans-serif",
    papel: "#FFFFFF", tinta: "#1D1B19", marca: "#1D1B19", marcaTxt: "#F4EFE6", acento: "#6B6A3A", suave: "#6C665F",
    padrao: "linear-gradient(135deg,#E9E1D3 25%,#DCD2C1 25% 50%,#E9E1D3 50% 75%,#DCD2C1 75%) 0 0/40px 40px",
  },
  academia: {
    familia: "vitrine", fontes: F(["Archivo:wdth,wght@62..125,500;62..125,800;62..125,900"]),
    titulo: "'Archivo', Impact, sans-serif", corpo: "'Archivo', system-ui, sans-serif", caixaAlta: true, larguraTitulo: "font-stretch:70%;",
    papel: "#F1F1EE", tinta: "#1F2124", marca: "#1F2124", marcaTxt: "#F1F1EE", acento: "#D7263D", suave: "#5F6268",
    padrao: "repeating-linear-gradient(90deg,#1F2124 0 6px,transparent 6px 26px),#C9CAC6",
  },
  generico: {
    familia: "vitrine", fontes: F(["Manrope:wght@400;500;700;800"]),
    titulo: "'Manrope', system-ui, sans-serif", corpo: "'Manrope', system-ui, sans-serif",
    papel: "#FFFFFF", tinta: "#1C2B4A", marca: "#1C2B4A", marcaTxt: "#EEF2F9", acento: "#E0A100", suave: "#58657D",
    padrao: "linear-gradient(135deg,#E9EEF6 25%,#DDE4F0 25% 50%,#E9EEF6 50% 75%,#DDE4F0 75%) 0 0/36px 36px",
  },
};


// Fotos ilustrativas (Unsplash, licença gratuita) até o cliente mandar as dele
const FOTOS = {
 "barbearia": [
  "photo-1599351431202-1e0f0137899a",
  "photo-1621645582931-d1d3e6564943",
  "photo-1605497788044-5a32c7078486"
 ],
 "hamburgueria": [
  "photo-1607013251379-e6eecfffe234",
  "photo-1550547660-d9450f859349",
  "photo-1606755962773-d324e0a13086"
 ],
 "pizzaria": [
  "photo-1565299624946-b28f40a0ae38",
  "photo-1593504049359-74330189a345",
  "photo-1613564834361-9436948817d1"
 ],
 "acai": [
  "photo-1627308594190-a057cd4bfac8",
  "photo-1684403620650-81dc661a69db",
  "photo-1709139068234-f83a548f3bec"
 ],
 "padaria": [
  "photo-1515823662972-da6a2e4d3002",
  "photo-1635341814289-55cf1490024c",
  "photo-1534620808146-d33bb39128b2"
 ],
 "restaurante": [
  "photo-1467003909585-2f8a72700288",
  "photo-1550367363-ea12860cc124",
  "photo-1652690772450-2cc9c53060f5"
 ],
 "oficina": [
  "photo-1615906655593-ad0386982a0f",
  "photo-1637640125496-31852f042a60",
  "photo-1727893332539-95e491ba4d90"
 ],
 "estetica_auto": [
  "photo-1633014041037-f5446fb4ce99",
  "photo-1708805282706-f44730b7e527",
  "photo-1605437241278-c1806d14a4d9"
 ],
 "salao": [
  "photo-1774660810725-fb04e002003d",
  "photo-1781450090585-1a511b7066d9",
  "photo-1560869713-7d0a29430803"
 ],
 "manicure": [
  "photo-1610992015762-45dca7fa3a85",
  "photo-1604902396830-aca29e19b067",
  "photo-1690749138086-7422f71dc159"
 ],
 "dentista": [
  "photo-1588776814546-daab30f310ce",
  "photo-1762625570087-6d98fca29531",
  "photo-1606811856475-5e6fcdc6e509"
 ],
 "clinica": [
  "photo-1762625570087-6d98fca29531",
  "photo-1731514693674-a32211b63996",
  "photo-1731514721772-329626f84c8b"
 ],
 "pet": [
  "photo-1588943211346-0908a1fb0b01",
  "photo-1537151608828-ea2b11777ee8",
  "photo-1616032776175-77c09e280ad8"
 ],
 "loja": [
  "photo-1532453288672-3a27e9be9efd",
  "photo-1767968037382-8eb9c564339f",
  "photo-1603400521630-9f2de124b33b"
 ],
 "academia": [
  "photo-1637430308606-86576d8fef3c",
  "photo-1620188467120-5042ed1eb5da",
  "photo-1771270786606-f5a0e57db762"
 ],
 "generico": [
  "photo-1610839123817-236de748e5c9",
  "photo-1595245761073-0eb3ca3f179c",
  "photo-1622915753421-5856600e44a5"
 ]
};
const foto = (id, w = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=72`;
// largura média de cada letra no título (em), para o nome caber sem quebrar no meio da palavra
const FATOR = {"barbearia": 0.55, "hamburgueria": 0.86, "pizzaria": 0.62, "acai": 0.62, "padaria": 0.64, "restaurante": 0.6, "oficina": 0.56, "estetica_auto": 0.56, "salao": 0.5, "manicure": 0.5, "dentista": 0.68, "clinica": 0.68, "pet": 0.6, "loja": 0.56, "academia": 0.62, "generico": 0.68};

// Direção de arte do nicho (usada também pela página de proposta)
export const temaVisual = (nicho) => ({ ...(D[nicho] || D.generico), fotos: (FOTOS[nicho] || FOTOS.generico).map((id) => foto(id, 1000)) });

// ---------------------------------------------------------------- peças comuns
function dados(l) {
  const t = TEMAS[l.nicho] || TEMAS.generico;
  const d = D[l.nicho] || D.generico;
  const nome = nomeCurto(l.nome);
  const num = numeroWhats(l);
  const tel = digitos(l.telefone).replace(/^0+/, "");
  const contato = num ? { url: `https://wa.me/${num}`, ic: "zap", rot: "Chamar no WhatsApp", curto: "pelo WhatsApp" }
    : l.telefone ? { url: `tel:+55${tel}`, ic: "fone", rot: `Ligar ${l.telefone}`, curto: "por telefone" }
    : { url: linkMaps(l), ic: "pin", rot: "Ver no Google Maps", curto: "no local" };
  const temNota = l.nota != null && l.avaliacoes;
  const rua = String(l.endereco || "").split(" - ")[0];
  const lugar = [l.bairro, l.cidade].filter(Boolean).join(", ");
  const mapa = "https://maps.google.com/maps?q=" + encodeURIComponent(`${nome}, ${l.endereco || lugar}`) + "&z=16&output=embed";
  const ids = FOTOS[l.nicho] || FOTOS.generico;
  const maior = Math.max(...nome.split(/\s+/).map((p) => p.length), 4);
  const h1 = `style="--fit:calc(100cqi / ${(maior * (FATOR[l.nicho] || .62) * 1.04).toFixed(2)})"`;
  return { t, d, nome, contato, temNota, rua, lugar, mapa, tel, ids, h1 };
}

const estrelas = (n) => {
  const cheias = Math.round(Number(n || 0));
  return `<span class="estrelas" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i class="${i < cheias ? "on" : ""}">${svg("estrela", 15, 0, true)}</i>`).join("")}</span>`;
};

function fotos(x, rotulos) {
  return `<div class="fotos">${rotulos.map((r, i) => `<figure class="foto f${i + 1}"><img src="${foto(x.ids[i % x.ids.length], i === 0 ? 1100 : 700)}" alt="${esc(r)} (foto ilustrativa)" loading="lazy" onerror="this.remove()"><figcaption>${esc(r)}</figcaption></figure>`).join("")}</div>
  <p class="aviso-fotos">Fotos ilustrativas. Na versão final entram as fotos reais de ${esc(x.nome)}.</p>`;
}

function localizacao(x, l) {
  return `<section class="onde" id="onde">
    <div class="onde-txt">
      <h2>Onde estamos</h2>
      ${l.endereco ? `<p class="end">${esc(l.endereco)}</p>` : x.lugar ? `<p class="end">${esc(x.lugar)}</p>` : ""}
      ${l.telefone ? `<p class="fone"><a href="tel:+55${x.tel}">${esc(l.telefone)}</a></p>` : ""}
      <div class="acoes">
        <a class="btn cheio" href="${esc(x.contato.url)}">${svg(x.contato.ic, 18)} ${esc(x.contato.rot)}</a>
        <a class="btn linha" href="${esc(linkMaps(l))}" target="_blank" rel="noopener">${svg("pin", 18)} Como chegar</a>
      </div>
    </div>
    <div class="mapa"><iframe title="Mapa de ${esc(x.nome)}" src="${esc(x.mapa)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </section>`;
}

function rodape(x, l) {
  return `<footer class="rodape"><b>${esc(x.nome)}</b>${l.endereco ? `<span>${esc(l.endereco)}</span>` : ""}<small>Modelo de demonstração, não é o site oficial.</small></footer>
  <a class="flut ${x.contato.ic}" href="${esc(x.contato.url)}" aria-label="${esc(x.contato.rot)}">${svg(x.contato.ic, 26)}</a>`;
}

const notaServicos = `<p class="nota-serv">Serviços de exemplo. Na versão final entram os seus, com valores.</p>`;

// ---------------------------------------------------------------- layout: placa (letreiro + quadro)
function placa(x, l) {
  const { t, d } = x;
  const linhas = t.servicos.map(([s, desc]) => `<li><span class="item">${esc(s)}</span><span class="pontos" aria-hidden="true"></span><span class="desc">${esc(desc)}</span></li>`).join("");
  return `
  <header class="fachada">
    <div class="faixa" aria-hidden="true"></div>
    <div class="fachada-in">
      <p class="tipo">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes"><a class="btn cheio" href="${esc(x.contato.url)}">${svg(x.contato.ic, 18)} ${esc(t.cta)}</a><a class="btn linha" href="#onde">Ver endereço</a></div>
    </div>
    ${x.temNota ? `<div class="selo" aria-label="Nota ${notaBR(l.nota)} no Google"><b>${notaBR(l.nota)}</b>${estrelas(l.nota)}<span>${milhar(l.avaliacoes)} avaliações no Google</span></div>` : ""}
  </header>
  <main>
    <section class="quadro">
      <h2>${esc(d.quadro)}</h2>
      <ul class="lista-quadro">${linhas}</ul>
      ${notaServicos}
    </section>
    <section class="galeria">${fotos(x, ["O balcão", "O ambiente", "Os clientes"])}</section>
    ${localizacao(x, l)}
  </main>${rodape(x, l)}`;
}

// ---------------------------------------------------------------- layout: oficina (ordem de serviço)
function oficina(x, l) {
  const { t, d } = x;
  const itens = t.servicos.map(([s, desc]) => `<li><span class="caixa" aria-hidden="true">${svg("check", 14, 2.6)}</span><div><b>${esc(s)}</b><span>${esc(desc)}</span></div></li>`).join("");
  return `
  <div class="zebra" aria-hidden="true"></div>
  <header class="topo-of">
    <div class="topo-txt">
      <p class="tipo">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes"><a class="btn cheio" href="${esc(x.contato.url)}">${svg(x.contato.ic, 18)} ${esc(t.cta)}</a><a class="btn linha" href="#onde">Como chegar</a></div>
      ${x.temNota ? `<p class="prova">${estrelas(l.nota)} <b>${notaBR(l.nota)}</b> de nota em ${milhar(l.avaliacoes)} avaliações no Google</p>` : ""}
    </div>
    <aside class="os" aria-label="${esc(d.quadro)}">
      <div class="os-cab"><b>${esc(d.quadro)}</b><span>${esc(x.nome)}</span></div>
      <ul>${itens}</ul>
      <a class="os-pe" href="${esc(x.contato.url)}">Pedir orçamento ${esc(x.contato.curto)}</a>
    </aside>
  </header>
  <main>
    ${notaServicos.replace('class="nota-serv"', 'class="nota-serv centro"')}
    <section class="galeria">${fotos(x, ["A oficina", "O serviço", "O cuidado"])}</section>
    ${localizacao(x, l)}
  </main>${rodape(x, l)}`;
}

// ---------------------------------------------------------------- layout: agenda (cartão de agendamento)
function agenda(x, l) {
  const { t } = x;
  const servs = t.servicos.map(([s, desc]) => `<div class="serv"><h3>${esc(s)}</h3><p>${esc(desc)}</p></div>`).join("");
  return `
  <header class="capa">
    <div class="capa-txt">
      <p class="tipo">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
    </div>
    <aside class="agendar">
      <h2>Agende seu horário</h2>
      ${x.temNota ? `<p class="prova">${estrelas(l.nota)}<span><b>${notaBR(l.nota)}</b> · ${milhar(l.avaliacoes)} avaliações no Google</span></p>` : ""}
      <dl>
        ${l.endereco ? `<dt>Endereço</dt><dd>${esc(x.rua)}${l.bairro ? `<br>${esc(l.bairro)}` : ""}</dd>` : ""}
        ${l.telefone ? `<dt>Telefone</dt><dd><a href="tel:+55${x.tel}">${esc(l.telefone)}</a></dd>` : ""}
      </dl>
      <a class="btn cheio largo" href="${esc(x.contato.url)}">${svg(x.contato.ic, 18)} ${esc(t.cta)}</a>
      <a class="mais" href="#onde">Ver no mapa</a>
    </aside>
    <div class="capa-arte" aria-hidden="true" style="background-image:url('${foto(x.ids[0], 1200)}')"></div>
  </header>
  <main>
    <section class="servicos"><h2>Serviços</h2><div class="servs">${servs}</div>${notaServicos}</section>
    <section class="galeria">${fotos(x, ["O espaço", "O atendimento", "Os detalhes"])}</section>
    ${localizacao(x, l)}
  </main>${rodape(x, l)}`;
}

// ---------------------------------------------------------------- layout: vitrine
function vitrine(x, l) {
  const { t } = x;
  const servs = t.servicos.slice(0, 4).map(([s, desc]) => `<div class="serv"><h3>${esc(s)}</h3><p>${esc(desc)}</p></div>`).join("");
  return `
  <header class="vit">
    <div class="vit-txt">
      <p class="tipo">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes"><a class="btn cheio" href="${esc(x.contato.url)}">${svg(x.contato.ic, 18)} ${esc(t.cta)}</a><a class="btn linha" href="#onde">Ver endereço</a></div>
      ${x.temNota ? `<p class="prova">${estrelas(l.nota)} <b>${notaBR(l.nota)}</b> em ${milhar(l.avaliacoes)} avaliações no Google</p>` : ""}
    </div>
    <div class="vit-arte" aria-hidden="true" style="background-image:url('${foto(x.ids[0], 1100)}')"><span>${esc(iniciais(x.nome))}</span></div>
  </header>
  <main>
    <section class="servicos"><div class="servs quatro">${servs}</div>${notaServicos}</section>
    <section class="galeria">${fotos(x, ["Vitrine", "Por dentro", "Detalhes"])}</section>
    ${localizacao(x, l)}
  </main>${rodape(x, l)}`;
}

// ---------------------------------------------------------------- CSS
function css(x) {
  const d = x.d;
  const caixa = d.caixaAlta ? "text-transform:uppercase;" : "";
  return `
:root{--papel:${d.papel};--tinta:${d.tinta};--marca:${d.marca};--marca-txt:${d.marcaTxt};--acento:${d.acento};--suave:${d.suave};--padrao:${d.padrao};--tit:${d.titulo};--corpo:${d.corpo}}
*{box-sizing:border-box}html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--papel);color:var(--tinta);font:17px/1.6 var(--corpo);-webkit-font-smoothing:antialiased}
a{color:inherit}img{max-width:100%}
:focus-visible{outline:3px solid var(--acento);outline-offset:3px}
h1,h2,h3{font-family:var(--tit);margin:0;line-height:1;overflow-wrap:anywhere;${d.larguraTitulo || ""}}
h2{font-size:clamp(30px,5vw,46px);${caixa}}
.demo-aviso{position:sticky;top:0;z-index:30;background:var(--tinta);color:var(--papel);font:13px/1.35 system-ui,sans-serif;text-align:center;padding:8px 16px}
.demo-aviso b{font-weight:700}
.tipo{margin:0 0 14px;font-size:15px;color:var(--suave);font-weight:500}
.chamada{font-size:clamp(18px,2.4vw,22px);max-width:34ch;margin:18px 0 28px}
.acoes{display:flex;flex-wrap:wrap;gap:10px}
.btn{display:inline-flex;align-items:center;gap:9px;min-height:50px;padding:0 22px;border-radius:999px;font-weight:600;font-size:16px;text-decoration:none;transition:transform .15s ease}
.btn:active{transform:scale(.98)}
.btn.cheio{background:var(--marca);color:var(--marca-txt)}
.btn.linha{border:2px solid currentColor}
.estrelas{display:inline-flex;gap:1px;vertical-align:-2px}.estrelas i{color:color-mix(in srgb,var(--tinta) 22%,transparent);display:inline-flex}.estrelas i.on{color:#E8A317}
main{display:block}
section{padding:72px 20px}
.galeria,.quadro,.servicos{max-width:1080px;margin:0 auto}
.nota-serv{font-size:14px;color:var(--suave);margin:22px 0 0}.nota-serv.centro{text-align:center;padding:28px 20px 0;margin:0}
.fotos{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:12px}
.foto{margin:0;aspect-ratio:4/5;border-radius:6px;background:var(--padrao);position:relative;overflow:hidden}
.foto.f1{aspect-ratio:auto;grid-row:span 1}
.foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.foto figcaption{z-index:1;position:absolute;left:10px;bottom:10px;background:var(--papel);color:var(--tinta);font-size:13px;font-weight:600;padding:5px 10px;border-radius:4px}
.aviso-fotos{font-size:14px;color:var(--suave);margin:12px 0 0}
.onde{display:grid;grid-template-columns:1fr 1.3fr;gap:32px;max-width:1080px;margin:0 auto;align-items:center}
.onde .end{font-size:19px;margin:18px 0 6px;max-width:36ch}.onde .fone{margin:0 0 24px;font-size:19px}.onde .fone a{text-decoration:none;font-weight:600}
.mapa{border-radius:8px;overflow:hidden;min-height:320px;background:var(--padrao);border:1px solid color-mix(in srgb,var(--tinta) 15%,transparent)}
.mapa iframe{width:100%;height:100%;min-height:320px;border:0;display:block}
.rodape{display:flex;flex-direction:column;gap:4px;align-items:center;text-align:center;padding:40px 20px 100px;border-top:1px solid color-mix(in srgb,var(--tinta) 14%,transparent);font-size:15px}
.rodape small{color:var(--suave);margin-top:8px}
.flut{position:fixed;right:16px;bottom:16px;z-index:20;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:var(--marca);color:var(--marca-txt);box-shadow:0 10px 24px -8px rgba(0,0,0,.45)}
.flut.zap{background:#1FAF55;color:#fff}

/* ---------- placa */
.fachada{position:relative;background:var(--marca);color:var(--marca-txt);overflow:hidden}
.fachada .faixa{height:22px;background:var(--padrao)}
.fachada-in{max-width:1080px;margin:0 auto;padding:56px 20px 64px}
.fachada .tipo{color:color-mix(in srgb,var(--marca-txt) 75%,transparent)}
.fachada-in,.topo-txt,.capa-txt,.vit-txt{container-type:inline-size}
h1{overflow-wrap:break-word;word-break:normal;hyphens:manual}
.fachada h1{font-size:min(150px,var(--fit));line-height:.88;${caixa}letter-spacing:${d.caixaAlta ? ".01em" : "-.02em"};max-width:12ch}
.fachada .btn.cheio{background:var(--acento);color:var(--tinta)}
.selo{position:absolute;right:max(20px,calc(50% - 520px));top:70px;width:150px;height:150px;border-radius:50%;background:var(--acento);color:var(--tinta);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;transform:rotate(-8deg);box-shadow:0 0 0 6px var(--marca),0 0 0 8px var(--acento)}
.selo b{font-family:var(--tit);font-size:44px;line-height:1}.selo .estrelas i.on{color:var(--tinta)}.selo span{font-size:12px;line-height:1.2;max-width:11ch;margin-top:4px;font-weight:600}
.quadro h2{margin-bottom:28px}
.lista-quadro{list-style:none;margin:0;padding:28px 28px;background:var(--tinta);color:var(--papel);border-radius:6px;columns:2;column-gap:48px}
.lista-quadro li{display:flex;align-items:baseline;gap:8px;padding:12px 0;break-inside:avoid}
.lista-quadro .item{font-family:var(--tit);font-size:22px;${caixa}white-space:nowrap}
.lista-quadro .pontos{flex:1;border-bottom:2px dotted color-mix(in srgb,var(--papel) 40%,transparent);transform:translateY(-5px);min-width:16px}
.lista-quadro .desc{font-size:14px;color:color-mix(in srgb,var(--papel) 75%,transparent);text-align:right;max-width:18ch}

/* ---------- oficina */
.zebra{height:14px;background:repeating-linear-gradient(-45deg,var(--acento) 0 16px,var(--tinta) 16px 32px)}
.topo-of{max-width:1080px;margin:0 auto;padding:56px 20px 40px;display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:start}
.topo-of h1{font-size:min(112px,var(--fit));line-height:.9;${caixa}}
.prova{margin:26px 0 0;font-size:15px;color:var(--suave);display:flex;flex-wrap:wrap;gap:6px;align-items:center}.prova b{color:var(--tinta)}
.os{background:#fff;color:#22262A;border:2px solid var(--tinta);border-radius:4px;box-shadow:8px 8px 0 var(--tinta)}
.os-cab{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:14px 18px;border-bottom:2px solid var(--tinta);background:var(--acento);color:#16191C}
.os-cab b{font-family:var(--tit);font-size:24px;${caixa}}.os-cab span{font-size:13px;font-weight:600;text-align:right}
.os ul{list-style:none;margin:0;padding:6px 18px}
.os li{display:flex;gap:12px;padding:12px 0;border-bottom:1px dashed #22262A44}.os li:last-child{border-bottom:0}
.os li b{display:block;font-size:17px}.os li span{font-size:14px;color:#5C6166}
.caixa{flex:none;width:22px;height:22px;border:2px solid #22262A;border-radius:3px;display:grid;place-items:center;color:#22262A;margin-top:2px}
.os-pe{display:block;text-align:center;padding:14px;background:var(--tinta);color:var(--marca-txt);font-weight:600;text-decoration:none}

/* ---------- agenda */
.capa{position:relative;max-width:1180px;margin:0 auto;padding:64px 20px 72px;display:grid;grid-template-columns:1.2fr .8fr;gap:48px;align-items:center}
.capa-arte{position:absolute;z-index:-1;right:0;top:0;bottom:0;width:46%;background:var(--padrao);background-size:cover;background-position:center;border-radius:0 0 0 220px}
.capa-arte::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--papel) 0,transparent 40%)}
.capa h1{font-size:min(118px,var(--fit));line-height:.92;font-weight:${x.d.titulo.includes("Cormorant") ? 600 : 800};letter-spacing:-.02em}
.agendar{background:var(--papel);border-radius:18px;padding:28px;box-shadow:0 30px 60px -30px color-mix(in srgb,var(--tinta) 55%,transparent);border:1px solid color-mix(in srgb,var(--tinta) 10%,transparent)}
.agendar h2{font-size:30px;margin-bottom:12px}
.agendar .prova{margin:0 0 16px;font-size:14px;color:var(--suave);display:flex;gap:8px;align-items:center;flex-wrap:wrap}.agendar .prova b{color:var(--tinta)}
.agendar dl{margin:0 0 20px;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:15px}.agendar dt{color:var(--suave)}.agendar dd{margin:0}
.btn.largo{width:100%;justify-content:center}
.mais{display:block;text-align:center;margin-top:12px;font-size:14px;color:var(--suave)}
.servicos h2{margin-bottom:28px}
.servs{display:grid;grid-template-columns:repeat(3,1fr);border-top:2px solid var(--tinta)}
.serv{padding:22px 22px 22px 0;border-bottom:1px solid color-mix(in srgb,var(--tinta) 16%,transparent)}
.serv h3{font-size:24px;line-height:1.15;margin-bottom:6px}.serv p{margin:0;color:var(--suave);font-size:15px}

/* ---------- vitrine */
.vit{max-width:1180px;margin:0 auto;padding:56px 20px 40px;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}
.vit h1{font-size:min(120px,var(--fit));line-height:.92;${caixa}letter-spacing:-.01em}
.vit-arte{aspect-ratio:4/5;background:var(--padrao);background-size:cover;background-position:center;border-radius:4px;position:relative}
.vit-arte span{position:absolute;left:16px;bottom:16px;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;background:var(--marca);color:var(--marca-txt);font-family:var(--tit);font-size:28px;${caixa}}
.servs.quatro{grid-template-columns:repeat(4,1fr)}

/* ---------- entrada: uma única sequência no topo */
@media (prefers-reduced-motion:no-preference){
  h1{animation:entra .8s cubic-bezier(.2,.7,.2,1) both}
  .chamada,.acoes{animation:entra .8s .12s cubic-bezier(.2,.7,.2,1) both}
  .selo{animation:carimbo .5s .45s cubic-bezier(.3,1.6,.5,1) both}
  .os,.agendar,.vit-arte{animation:entra .9s .2s cubic-bezier(.2,.7,.2,1) both}
}
@keyframes entra{from{opacity:0;transform:translateY(18px)}}
@keyframes carimbo{from{opacity:0;transform:rotate(-8deg) scale(1.6)}}

/* ---------- celular */
@media (max-width:820px){
  section{padding:56px 20px}
  .topo-of,.capa,.vit,.onde{grid-template-columns:1fr;gap:28px}
  .capa{padding-top:40px}.capa-arte{width:100%;height:150px;bottom:auto;border-radius:0 0 0 90px;opacity:.9}
  .capa-txt{padding-top:110px}
  .selo{position:relative;right:auto;top:auto;margin:-36px 20px 28px auto;width:124px;height:124px}.selo b{font-size:36px}
  .fachada-in{padding:40px 20px 52px}
  .lista-quadro{columns:1;padding:20px}
  .lista-quadro .item{font-size:20px;white-space:normal}
  .servs,.servs.quatro{grid-template-columns:1fr}
  .serv{padding-right:0}
  .fotos{grid-template-columns:1fr 1fr}.foto.f1{grid-column:span 2;aspect-ratio:16/10}
  .vit-arte{aspect-ratio:16/10}
  .os{box-shadow:5px 5px 0 var(--tinta)}
}`;
}

export function renderDemo(l, { preview = false } = {}) {
  const x = dados(l);
  const corpo = { placa, oficina, agenda, vitrine }[x.d.familia](x, l);
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(x.nome)}</title><meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="${x.d.marca}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${x.d.fontes}" rel="stylesheet">
<style>${css(x)}</style></head>
<body class="fam-${x.d.familia}">
<div class="demo-aviso"><b>Demonstração</b> criada para ${esc(x.nome)}. Não é o site oficial.${preview ? " (pré-visualização)" : ""}</div>
${corpo}
</body></html>`;
}
