// Sites demo (landing pages) com identidade por segmento:
//   abertura, seções, títulos e formulário mudam conforme o nicho (veja RECEITAS).
//   Nada é inventado: nota/avaliações, endereço e telefone vêm da ficha pública; serviços e fotos são exemplos sinalizados.
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
const FATOR = {"barbearia": 0.47, "hamburgueria": 0.86, "pizzaria": 0.62, "acai": 0.62, "padaria": 0.64, "restaurante": 0.6, "oficina": 0.56, "estetica_auto": 0.56, "salao": 0.57, "manicure": 0.57, "dentista": 0.68, "clinica": 0.68, "pet": 0.6, "loja": 0.56, "academia": 0.62, "generico": 0.68};

// Direção de arte do nicho (usada também pela página de proposta)
export const temaVisual = (nicho) => ({ ...(D[nicho] || D.generico), fotos: (FOTOS[nicho] || FOTOS.generico).map((id) => foto(id, 1000)) });

// ---------------------------------------------------------------- receitas por segmento
// Cada segmento tem abertura, seções, títulos e formulário próprios.
const RECEITAS = {
  barbearia:     { hero: "letreiro", raio: 3,  servicos: "tabela",       tServ: "Serviços",            tGal: "O trabalho",        form: "agendamento", ordem: ["prova", "servicos", "galeria", "form", "diferenciais", "faq", "onde"] },
  hamburgueria:  { hero: "letreiro", raio: 10, servicos: "cardapio",     tServ: "Cardápio",            tGal: "Da chapa pra mesa", form: "pedido",      ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  pizzaria:      { hero: "letreiro", raio: 8,  servicos: "cardapio",     tServ: "Cardápio",            tGal: "Direto do forno",   form: "pedido",      ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  acai:          { hero: "letreiro", raio: 14, servicos: "cardapio",     tServ: "Monte o seu",         tGal: "Feito na hora",     form: "pedido",      ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  padaria:       { hero: "letreiro", raio: 8,  servicos: "cardapio",     tServ: "No balcão",           tGal: "Fresquinho",        form: "encomenda",   ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  restaurante:   { hero: "letreiro", raio: 4,  servicos: "cardapio",     tServ: "Cardápio",            tGal: "O ambiente",        form: "reserva",     ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  oficina:       { hero: "os",       raio: 2,  servicos: "os",           tServ: "Serviços",            tGal: "A oficina",         form: "orcamento",   ordem: ["prova", "diferenciais", "form", "galeria", "faq", "onde"] },
  estetica_auto: { hero: "os",       raio: 4,  servicos: "os",           tServ: "Serviços",            tGal: "O cuidado",         form: "orcamento",   ordem: ["prova", "diferenciais", "form", "galeria", "faq", "onde"] },
  salao:         { hero: "agenda",   raio: 2,  servicos: "especialidades", tServ: "Serviços",          tGal: "O espaço",          form: "agendamento", ordem: ["prova", "servicos", "galeria", "passos", "faq", "onde"] },
  manicure:      { hero: "agenda",   raio: 6,  servicos: "especialidades", tServ: "Serviços",          tGal: "Os detalhes",       form: "agendamento", ordem: ["prova", "servicos", "galeria", "passos", "faq", "onde"] },
  dentista:      { hero: "agenda",   raio: 10, servicos: "especialidades", tServ: "Tratamentos",       tGal: "Estrutura",         form: "agendamento", ordem: ["prova", "servicos", "galeria", "passos", "faq", "onde"] },
  clinica:       { hero: "agenda",   raio: 10, servicos: "especialidades", tServ: "Especialidades",    tGal: "Estrutura",         form: "agendamento", ordem: ["prova", "servicos", "galeria", "passos", "faq", "onde"] },
  pet:           { hero: "agenda",   raio: 14, servicos: "especialidades", tServ: "Serviços",          tGal: "Quem passa por aqui", form: "agendamento", ordem: ["prova", "servicos", "galeria", "passos", "faq", "onde"] },
  loja:          { hero: "vitrine",  raio: 0,  servicos: "categorias",   tServ: "O que você encontra", tGal: "Vitrine",           form: "contato",     ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  academia:      { hero: "vitrine",  raio: 2,  servicos: "categorias",   tServ: "Modalidades",         tGal: "Estrutura",         form: "aula",        ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
  generico:      { hero: "vitrine",  raio: 8,  servicos: "categorias",   tServ: "O que fazemos",       tGal: "Fotos",             form: "contato",     ordem: ["prova", "servicos", "galeria", "diferenciais", "form", "faq", "onde"] },
};

// Formulários: montam a mensagem e abrem o WhatsApp da empresa (nada é enviado sem a pessoa confirmar)
const FORMS = {
  agendamento: { titulo: "Agende seu horário", verbo: "agendar", botao: "Enviar pedido de horário", campos: [["nome", "Seu nome", "text"], ["servico", "Serviço", "servicos"], ["quando", "Melhor dia e horário", "text", "Ex.: sábado de manhã"], ["obs", "Observação (opcional)", "textarea"]] },
  pedido:      { titulo: "Faça seu pedido", verbo: "pedir", botao: "Enviar pedido pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["pedido", "O que você quer pedir?", "textarea", "Ex.: 2 pizzas grandes, uma de calabresa e uma de frango"], ["entrega", "Entrega ou retirada?", "opcoes", "Entrega|Retirada no local"], ["endereco", "Endereço (se for entrega)", "text"]] },
  encomenda:   { titulo: "Faça sua encomenda", verbo: "encomendar", botao: "Enviar encomenda pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["pedido", "O que você quer encomendar?", "textarea", "Ex.: bolo de chocolate para 20 pessoas"], ["quando", "Para quando?", "text", "Ex.: sexta às 16h"]] },
  reserva:     { titulo: "Reserve ou peça", verbo: "reservar ou pedir", botao: "Enviar pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["tipo", "Você quer", "opcoes", "Reservar uma mesa|Fazer um pedido"], ["pessoas", "Quantas pessoas?", "text", "Ex.: 4"], ["quando", "Dia e horário", "text", "Ex.: sábado, 20h"]] },
  orcamento:   { titulo: "Peça seu orçamento", verbo: "pedir orçamento", botao: "Pedir orçamento pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["carro", "Carro (modelo e ano)", "text", "Ex.: Onix 2019"], ["servico", "Serviço", "servicos"], ["obs", "O que está acontecendo?", "textarea", "Ex.: barulho ao frear"]] },
  contato:     { titulo: "Fale com a gente", verbo: "falar com a gente", botao: "Enviar mensagem pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["servico", "Assunto", "servicos"], ["obs", "Mensagem", "textarea"]] },
  aula:        { titulo: "Agende uma visita", verbo: "agendar uma visita", botao: "Agendar pelo WhatsApp", campos: [["nome", "Seu nome", "text"], ["servico", "Interesse", "servicos"], ["quando", "Melhor dia e horário", "text", "Ex.: segunda às 19h"]] },
};

// ---------------------------------------------------------------- dados
function dados(l) {
  const t = TEMAS[l.nicho] || TEMAS.generico;
  const d = D[l.nicho] || D.generico;
  const r = RECEITAS[l.nicho] || RECEITAS.generico;
  const nome = nomeCurto(l.nome);
  const num = numeroWhats(l);
  const tel = digitos(l.telefone).replace(/^0+/, "");
  const contato = num ? { url: `https://wa.me/${num}`, ic: "zap", rot: "Chamar no WhatsApp", canal: "WhatsApp" }
    : l.telefone ? { url: `tel:+55${tel}`, ic: "fone", rot: `Ligar ${l.telefone}`, canal: "telefone" }
    : { url: linkMaps(l), ic: "pin", rot: "Ver no Google Maps", canal: "" };
  const temNota = l.nota != null && l.avaliacoes;
  const rua = String(l.endereco || "").split(" - ")[0];
  const lugar = [l.bairro, l.cidade].filter(Boolean).join(", ");
  const mapa = "https://maps.google.com/maps?q=" + encodeURIComponent(`${nome}, ${l.endereco || lugar}`) + "&z=16&output=embed";
  const ids = FOTOS[l.nicho] || FOTOS.generico;
  const maior = Math.max(...nome.split(/\s+/).map((p) => p.length), 4);
  const h1 = `style="--fit:calc(100cqi / ${(maior * (FATOR[l.nicho] || .62) * 1.04).toFixed(2)})"`;
  const avaliacoes = l.maps_url || "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${nome}, ${l.endereco || lugar}`);
  return { t, d, r, nome, num, contato, temNota, rua, lugar, mapa, tel, ids, h1, avaliacoes, f: FORMS[r.form] };
}

const estrelas = (n) => {
  const cheias = Math.round(Number(n || 0));
  return `<span class="estrelas" aria-hidden="true">${Array.from({ length: 5 }, (_, i) => `<i class="${i < cheias ? "on" : ""}">${svg("estrela", 15, 0, true)}</i>`).join("")}</span>`;
};
// imagem responsiva do Unsplash (srcset + tamanho fixo para não "pular" a página)
function img(id, alt, { larg = 900, sizes = "100vw", prioridade = false, w = 1200, h = 900 } = {}) {
  const set = [480, 768, 1100, 1600].filter((x) => x <= Math.max(larg, 480) * 1.6).map((x) => `${foto(id, x)} ${x}w`).join(", ");
  return `<img src="${foto(id, larg)}" srcset="${set}" sizes="${sizes}" width="${w}" height="${h}" alt="${esc(alt)}" ${prioridade ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" onerror="this.style.visibility='hidden'">`;
}
const botao = (x, classe = "cheio", texto) => `<a class="btn ${classe}" href="${esc(x.contato.url)}"${x.contato.ic === "pin" ? ' target="_blank" rel="noopener"' : ""}>${svg(x.contato.ic, 18)} ${esc(texto || x.t.cta)}</a>`;
const fotoTag = `<span class="tag-foto">Foto ilustrativa</span>`;

// ---------------------------------------------------------------- cabeçalho com menu
function cabecalho(x, links) {
  return `<header class="topo" id="inicio">
  <div class="topo-in">
    <a class="marca" href="#inicio" aria-label="${esc(x.nome)}, voltar ao início"><span class="mono">${esc(iniciais(x.nome))}</span><span class="marca-nome">${esc(x.nome)}</span></a>
    <nav class="menu" id="menu" aria-label="Seções">
      ${links.map(([id, rot]) => `<a href="#${id}">${esc(rot)}</a>`).join("")}
      ${botao(x, "cheio peq", x.contato.canal === "WhatsApp" ? "WhatsApp" : x.contato.canal === "telefone" ? "Ligar" : "Mapa")}
    </nav>
    <button class="abre-menu" type="button" aria-expanded="false" aria-controls="menu" aria-label="Abrir menu"><span></span><span></span><span></span></button>
  </div>
</header>`;
}

// ---------------------------------------------------------------- aberturas (hero)
function heroLetreiro(x, l) {
  const { t } = x;
  return `<section class="hero h-letreiro">
    <div class="h-painel"><div class="h-txt">
      <p class="kicker">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes">${botao(x, "acento")}<a class="btn contorno" href="#servicos">Ver ${esc(x.r.tServ.toLowerCase())}</a></div>
    </div></div>
    <figure class="h-foto">${img(x.ids[0], `${t.rotulo} (foto ilustrativa)`, { larg: 1100, sizes: "(max-width: 860px) 100vw, 50vw", prioridade: true })}${fotoTag}
      ${x.temNota ? `<div class="selo" aria-hidden="true"><b>${notaBR(l.nota)}</b>${estrelas(l.nota)}<span>no Google</span></div>` : ""}</figure>
  </section>`;
}

function heroOS(x, l) {
  const { t } = x;
  const itens = t.servicos.map(([s, desc]) => `<li><span class="caixa" aria-hidden="true">${svg("check", 13, 2.6)}</span><div><b>${esc(s)}</b><span>${esc(desc)}</span></div><a class="os-sel" href="#contato" data-servico="${esc(s)}" aria-label="Pedir orçamento de ${esc(s)}">Orçar</a></li>`).join("");
  return `<section class="hero h-os">
    <div class="h-txt">
      <p class="kicker">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes">${botao(x)}<a class="btn contorno" href="#contato">Pedir orçamento</a></div>
    </div>
    <figure class="h-foto">${img(x.ids[0], `${t.rotulo} (foto ilustrativa)`, { larg: 1100, sizes: "(max-width: 860px) 100vw, 55vw", prioridade: true })}${fotoTag}</figure>
    <aside class="os" id="servicos" aria-label="Serviços">
      <div class="os-cab"><b>Ordem de serviço</b><span>${esc(x.nome)}</span></div>
      <ul>${itens}</ul>
      <p class="os-nota">Serviços de exemplo. A versão final traz os serviços de vocês.</p>
    </aside>
  </section>`;
}

function heroAgenda(x, l) {
  const { t } = x;
  return `<section class="hero h-agenda">
    <div class="h-txt">
      <p class="kicker">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes">${botao(x)}<a class="btn contorno" href="#servicos">Ver ${esc(x.r.tServ.toLowerCase())}</a></div>
    </div>
    <div class="h-lado">
      <figure class="h-foto">${img(x.ids[0], `${t.rotulo} (foto ilustrativa)`, { larg: 1000, sizes: "(max-width: 860px) 100vw, 45vw", prioridade: true })}${fotoTag}</figure>
      <aside class="cartao" aria-label="Agendamento">
        <p class="cartao-tit">Agende seu horário</p>
        ${x.temNota ? `<p class="cartao-prova">${estrelas(l.nota)} <span><b>${notaBR(l.nota)}</b> em ${milhar(l.avaliacoes)} avaliações</span></p>` : ""}
        ${l.endereco ? `<p class="cartao-linha">${svg("pin", 16)}<span>${esc(x.rua)}${l.bairro ? `, ${esc(l.bairro)}` : ""}</span></p>` : ""}
        ${botao(x, "cheio largo", x.num ? "Agendar pelo WhatsApp" : x.contato.rot)}
      </aside>
    </div>
  </section>`;
}

function heroVitrine(x, l) {
  const { t } = x;
  return `<section class="hero h-vitrine">
    <figure class="h-foto">${img(x.ids[0], `${t.rotulo} (foto ilustrativa)`, { larg: 1600, sizes: "100vw", prioridade: true, w: 1600, h: 1000 })}${fotoTag}</figure>
    <div class="h-txt">
      <p class="kicker">${esc(t.rotulo)}${x.lugar ? ` em ${esc(x.lugar)}` : ""}</p>
      <h1 ${x.h1}>${esc(x.nome)}</h1>
      <p class="chamada">${esc(t.chamada)}</p>
      <div class="acoes">${botao(x, "acento")}<a class="btn contorno claro" href="#onde">Como chegar</a></div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------- seções
const notaServicos = `<p class="nota-serv">Serviços de exemplo. Na versão final entram os de vocês.</p>`;

function secProva(x, l) {
  if (!x.temNota) return "";
  return `<section class="prova" aria-label="Avaliações no Google"><div class="faixa-in">
    <div class="prova-nota"><b>${notaBR(l.nota)}</b>${estrelas(l.nota)}</div>
    <p><strong>${milhar(l.avaliacoes)} avaliações</strong> de clientes no Google.</p>
    <a class="link-seta" href="${esc(x.avaliacoes)}" target="_blank" rel="noopener">Ler as avaliações${svg("seta", 16)}</a>
  </div></section>`;
}

function secServicos(x) {
  const { t, r } = x;
  const s = t.servicos;
  let corpo = "";
  if (r.servicos === "cardapio") {
    corpo = `<ul class="quadro">${s.map(([n, d]) => `<li><span class="item">${esc(n)}</span><span class="pontos" aria-hidden="true"></span><span class="desc">${esc(d)}</span></li>`).join("")}</ul>`;
  } else if (r.servicos === "tabela") {
    corpo = `<ul class="tabela">${s.map(([n, d]) => `<li><div><b>${esc(n)}</b><span>${esc(d)}</span></div><a href="#contato" data-servico="${esc(n)}">Agendar${svg("seta", 15)}</a></li>`).join("")}</ul>`;
  } else if (r.servicos === "especialidades") {
    corpo = `<ul class="espec">${s.map(([n, d]) => `<li><span class="ic">${svg(t.icone, 22)}</span><h3>${esc(n)}</h3><p>${esc(d)}</p><a href="#contato" data-servico="${esc(n)}">Agendar${svg("seta", 15)}</a></li>`).join("")}</ul>`;
  } else {
    corpo = `<ul class="categ">${s.slice(0, 4).map(([n, d]) => `<li><h3>${esc(n)}</h3><p>${esc(d)}</p></li>`).join("")}</ul>`;
  }
  return `<section class="sec servicos" id="servicos"><div class="sec-in rev">
    <h2>${esc(r.tServ)}</h2>${corpo}${notaServicos}
  </div></section>`;
}

function secGaleria(x) {
  const rot = ["O espaço", "O atendimento", "Os detalhes"];
  const ids = [x.ids[1], x.ids[2], x.ids[0]];
  return `<section class="sec galeria" id="fotos"><div class="sec-in rev">
    <h2>${esc(x.r.tGal)}</h2>
    <div class="fotos">${ids.map((id, i) => `<button class="foto f${i + 1}" type="button" data-amplia="${foto(id, 1600)}" aria-label="Ampliar foto: ${esc(rot[i])}">${img(id, `${rot[i]} (foto ilustrativa)`, { larg: i ? 700 : 1100, sizes: i ? "(max-width: 860px) 50vw, 25vw" : "(max-width: 860px) 100vw, 50vw" })}</button>`).join("")}</div>
    <p class="nota-serv">Fotos ilustrativas. Na versão final entram as fotos reais de ${esc(x.nome)}.</p>
  </div></section>`;
}

function secDiferenciais(x, l) {
  const itens = [];
  if (x.temNota) itens.push(["estrela", `Nota ${notaBR(l.nota)} no Google`, `${milhar(l.avaliacoes)} clientes já avaliaram ${x.nome}.`]);
  itens.push(x.num ? ["zap", "Atendimento pelo WhatsApp", "Tire dúvidas e combine tudo direto pelo celular."]
    : ["fone", "Atendimento por telefone", l.telefone ? `Ligue: ${l.telefone}.` : "Fale com a gente."]);
  if (l.endereco || l.bairro) itens.push(["pin", l.bairro ? `Em ${l.bairro}` : "Fácil de chegar", `${x.rua || x.lugar}. Abra a rota no Google Maps.`]);
  return `<section class="sec diferenciais"><div class="sec-in rev">
    <h2>Por que escolher ${esc(x.nome)}</h2>
    <ul class="dif">${itens.map(([ic, ti, de]) => `<li><span class="ic">${svg(ic, 22)}</span><div><h3>${esc(ti)}</h3><p>${esc(de)}</p></div></li>`).join("")}</ul>
  </div></section>`;
}

function campo(x, [id, rot, tipo, extra], largo = false) {
  const nome = `name="${id}" id="f-${id}"`;
  if (tipo === "textarea") return `<label class="campo largo" for="f-${id}"><span>${esc(rot)}</span><textarea ${nome} rows="3"${extra ? ` placeholder="${esc(extra)}"` : ""}></textarea></label>`;
  if (tipo === "servicos") return `<label class="campo${largo ? " largo" : ""}" for="f-${id}"><span>${esc(rot)}</span><select ${nome}><option value="">Escolha</option>${x.t.servicos.map(([s]) => `<option>${esc(s)}</option>`).join("")}<option>Outro</option></select></label>`;
  if (tipo === "opcoes") return `<label class="campo${largo ? " largo" : ""}" for="f-${id}"><span>${esc(rot)}</span><select ${nome}>${extra.split("|").map((o) => `<option>${esc(o)}</option>`).join("")}</select></label>`;
  return `<label class="campo${largo ? " largo" : ""}" for="f-${id}"><span>${esc(rot)}</span><input ${nome} type="text"${id === "nome" ? ' autocomplete="name" required' : ""}${extra ? ` placeholder="${esc(extra)}"` : ""}></label>`;
}

function secForm(x, l, { passos = false } = {}) {
  const { f } = x;
  const ladoPassos = passos ? `<ol class="passos">
      <li><b>Escolha o serviço</b><span>Veja a lista acima ou conte o que precisa.</span></li>
      <li><b>Envie pelo ${x.num ? "WhatsApp" : "telefone"}</b><span>O pedido chega pronto, sem precisar digitar tudo.</span></li>
      <li><b>Confirme o horário</b><span>${esc(x.nome)} responde e combina com você.</span></li>
    </ol>` : `<div class="form-lado"><p>Preencha e a mensagem já sai pronta para ${esc(x.nome)}${x.num ? " no WhatsApp" : ""}.</p>
      ${l.telefone ? `<p class="fone">${svg("fone", 18)}<a href="tel:+55${x.tel}">${esc(l.telefone)}</a></p>` : ""}</div>`;
  const form = x.num ? `<form class="form" data-wa="${x.num}" data-nome="${esc(x.nome)}" novalidate>
      ${(() => { const curtos = f.campos.filter((c) => c[2] !== "textarea"); const ultimo = curtos.length % 2 ? curtos[curtos.length - 1] : null; return f.campos.map((c) => campo(x, c, c === ultimo)).join(""); })()}
      <button class="btn cheio largo" type="submit">${svg("zap", 18)} ${esc(f.botao)}</button>
      <p class="form-aviso">Abre o WhatsApp com a mensagem pronta. Nada é enviado sem você confirmar.</p>
    </form>` : `<div class="form sem-wa"><p>Para ${esc(f.verbo)}, fale direto com ${esc(x.nome)}:</p>${botao(x, "cheio largo", x.contato.rot)}</div>`;
  return `<section class="sec contato" id="contato"><div class="sec-in rev grade-form">
    <div><h2>${esc(passos ? "Como agendar" : f.titulo)}</h2>${ladoPassos}</div>${form}
  </div></section>`;
}

function secFAQ(x, l) {
  const como = x.num ? `Pelo WhatsApp: use o formulário desta página ou o botão verde. O número é ${esc(l.telefone)}.`
    : l.telefone ? `Pelo telefone ${esc(l.telefone)}.` : "Pelos contatos desta página.";
  const qs = [
    [`Como ${x.f.verbo}?`, como],
    l.endereco ? [`Onde fica ${x.nome}?`, `${esc(l.endereco)}. Use o botão “Como chegar” para abrir a rota no Google Maps.`] : null,
    ["Qual o horário de funcionamento?", `O horário pode mudar em feriados. Confirme o horário do dia pelo ${x.num ? "WhatsApp" : "telefone"} antes de vir.`],
    l.instagram ? ["Vocês têm Instagram?", `Sim: <a href="${esc(l.instagram)}" target="_blank" rel="noopener">veja o perfil</a>.`] : null,
  ].filter(Boolean);
  return `<section class="sec faq" id="duvidas"><div class="sec-in rev">
    <h2>Dúvidas frequentes</h2>
    <div class="perguntas">${qs.map(([p, r], i) => `<details${i === 0 ? " open" : ""}><summary>${esc(p)}${svg("mais", 18)}</summary><p>${r}</p></details>`).join("")}</div>
  </div></section>`;
}

function secOnde(x, l) {
  return `<section class="sec onde" id="onde"><div class="sec-in rev grade-onde">
    <div>
      <h2>Onde estamos</h2>
      ${l.endereco ? `<p class="end">${esc(l.endereco)}</p>` : x.lugar ? `<p class="end">${esc(x.lugar)}</p>` : ""}
      ${l.telefone ? `<p class="fone">${svg("fone", 18)}<a href="tel:+55${x.tel}">${esc(l.telefone)}</a></p>` : ""}
      <div class="acoes">${botao(x, "cheio", x.contato.rot)}<a class="btn contorno" href="${esc(linkMaps(l))}" target="_blank" rel="noopener">${svg("pin", 18)} Como chegar</a></div>
    </div>
    <div class="mapa"><iframe title="Mapa de ${esc(x.nome)}" src="${esc(x.mapa)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
  </div></section>`;
}

function rodape(x, l, links) {
  return `<footer class="rodape"><div class="rodape-in">
    <div><b>${esc(x.nome)}</b>${l.endereco ? `<span>${esc(l.endereco)}</span>` : ""}${l.telefone ? `<span><a href="tel:+55${x.tel}">${esc(l.telefone)}</a></span>` : ""}</div>
    <nav aria-label="Rodapé">${links.map(([id, rot]) => `<a href="#${id}">${esc(rot)}</a>`).join("")}${l.instagram ? `<a href="${esc(l.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ""}</nav>
  </div><p class="assina">Modelo de demonstração, não é o site oficial.</p></footer>
  <a class="flut ${x.contato.ic}" href="${esc(x.contato.url)}" aria-label="${esc(x.contato.rot)}">${svg(x.contato.ic, 26)}</a>
  <dialog class="caixa-foto" aria-label="Foto ampliada"><button type="button" class="fecha" aria-label="Fechar">${svg("x", 22)}</button><img alt=""></dialog>`;
}

// ---------------------------------------------------------------- montagem
function montar(x, l) {
  const r = x.r;
  const hero = { letreiro: heroLetreiro, os: heroOS, agenda: heroAgenda, vitrine: heroVitrine }[r.hero](x, l);
  const S = {
    prova: () => secProva(x, l),
    servicos: () => secServicos(x),
    galeria: () => secGaleria(x),
    diferenciais: () => secDiferenciais(x, l),
    form: () => secForm(x, l),
    passos: () => secForm(x, l, { passos: true }),
    faq: () => secFAQ(x, l),
    onde: () => secOnde(x, l),
  };
  const links = [
    ["servicos", r.tServ],
    ["fotos", "Fotos"],
    ["contato", r.form === "agendamento" || r.form === "aula" ? "Agendar" : r.form === "orcamento" ? "Orçamento" : r.form === "contato" ? "Contato" : "Pedir"],
    ["onde", "Onde estamos"],
  ].filter(Boolean);
  return cabecalho(x, links) + `<main>${hero}${r.ordem.map((k) => S[k]()).join("")}</main>` + rodape(x, l, links);
}

// ---------------------------------------------------------------- CSS
function css(x) {
  const d = x.d, r = x.r;
  const caixa = d.caixaAlta ? "text-transform:uppercase;" : "";
  const R = r.raio + "px";
  return `
:root{--papel:${d.papel};--tinta:${d.tinta};--marca:${d.marca};--marca-txt:${d.marcaTxt};--acento:${d.acento};--suave:${d.suave};--padrao:${d.padrao};--tit:${d.titulo};--corpo:${d.corpo};--raio:${R};
  --linha:color-mix(in srgb,var(--tinta) 14%,transparent);--fundo2:color-mix(in srgb,var(--tinta) 4%,var(--papel));--sombra:0 18px 40px -24px color-mix(in srgb,var(--tinta) 55%,transparent);--max:1140px}
*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:84px;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--papel);color:var(--tinta);font:17px/1.6 var(--corpo);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}img{max-width:100%;height:auto;display:block}button{font:inherit;color:inherit}
:focus-visible{outline:3px solid var(--acento);outline-offset:3px;border-radius:2px}
h1,h2,h3{font-family:var(--tit);margin:0;line-height:1.05;overflow-wrap:break-word;text-wrap:balance;${d.larguraTitulo || ""}}
h2{font-size:clamp(30px,4.6vw,48px);margin-bottom:28px;${caixa}letter-spacing:${d.caixaAlta ? ".01em" : "-.01em"}}
h3{font-size:20px;line-height:1.2}
p{margin:0}
.demo-aviso{background:var(--tinta);color:var(--papel);font:13px/1.35 system-ui,sans-serif;text-align:center;padding:8px 16px}

/* botões */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;min-height:50px;padding:0 22px;border-radius:var(--raio);font-weight:600;font-size:16px;text-decoration:none;border:2px solid transparent;cursor:pointer;transition:transform .15s ease,background-color .15s ease,box-shadow .15s ease;white-space:nowrap}
.btn:hover{transform:translateY(-1px);box-shadow:var(--sombra)}.btn:active{transform:translateY(1px);box-shadow:none}
.btn.cheio{background:var(--marca);color:var(--marca-txt)}
.btn.acento{background:var(--acento);color:var(--tinta)}
.btn.contorno{border-color:currentColor;background:transparent}
.btn.contorno.claro{color:#fff}
.btn.peq{min-height:40px;padding:0 16px;font-size:15px}
.btn.largo{width:100%}
.acoes{display:flex;flex-wrap:wrap;gap:10px}
.link-seta{display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none;border-bottom:2px solid var(--acento);padding-bottom:2px}
.estrelas{display:inline-flex;gap:1px;vertical-align:-2px}.estrelas i{display:inline-flex;color:color-mix(in srgb,var(--tinta) 20%,transparent)}.estrelas i.on{color:#E8A317}

/* cabeçalho */
.topo{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--papel) 92%,transparent);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid var(--linha)}
.topo-in{max-width:var(--max);margin:0 auto;padding:10px 20px;display:flex;align-items:center;gap:16px;min-height:66px}
.marca{display:flex;align-items:center;gap:10px;text-decoration:none;min-width:0;margin-right:auto}
.mono{flex:none;width:40px;height:40px;border-radius:${r.raio > 8 ? "50%" : R};display:grid;place-items:center;background:var(--marca);color:var(--marca-txt);font-family:var(--tit);font-weight:700;font-size:16px}
.marca-nome{font-family:var(--tit);font-weight:700;font-size:18px;${caixa}white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.menu{display:flex;align-items:center;gap:22px}
.menu a:not(.btn){text-decoration:none;font-size:15px;font-weight:500;color:color-mix(in srgb,var(--tinta) 80%,transparent)}
.menu a:not(.btn):hover{color:var(--tinta);text-decoration:underline;text-underline-offset:6px;text-decoration-color:var(--acento)}
.abre-menu{display:none;width:44px;height:44px;border:0;background:none;padding:10px;cursor:pointer}
.abre-menu span{display:block;height:2px;background:var(--tinta);margin:5px 0;transition:transform .2s,opacity .2s}

/* hero: base */
.hero{position:relative}
.kicker{font-size:15px;font-weight:500;margin-bottom:14px;opacity:.85}
.h-txt{container-type:inline-size}
h1{overflow-wrap:break-word;word-break:normal;hyphens:manual;font-size:min(var(--hmax,120px),var(--fit));line-height:.92;${caixa}letter-spacing:${d.caixaAlta ? ".01em" : "-.02em"}}
.chamada{font-size:clamp(18px,2.2vw,22px);line-height:1.45;max-width:32ch;margin:18px 0 30px}
.h-foto{margin:0;position:relative;overflow:hidden;background:var(--padrao)}
.h-foto img{width:100%;height:100%;object-fit:cover}
.tag-foto{position:absolute;right:10px;bottom:10px;background:rgba(0,0,0,.55);color:#fff;font:12px/1 system-ui,sans-serif;padding:5px 8px;border-radius:3px}

/* hero letreiro */
.h-letreiro{display:grid;grid-template-columns:1.05fr .95fr;min-height:min(86vh,760px)}
.h-painel{background:var(--marca);color:var(--marca-txt);display:flex;align-items:center;justify-content:flex-end}
.h-letreiro .h-txt{width:100%;max-width:calc(var(--max) / 2 + 20px);padding:64px 48px 64px 20px;--hmax:132px}
.h-letreiro .btn.contorno{color:var(--marca-txt)}
.h-letreiro .h-foto{min-height:420px}
.selo{position:absolute;left:24px;top:24px;width:118px;height:118px;border-radius:50%;background:var(--papel);color:var(--tinta);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:var(--sombra)}
.selo b{font-family:var(--tit);font-size:34px;line-height:1}.selo span{font-size:12px;font-weight:600}

/* hero ordem de serviço */
.h-os{max-width:var(--max);margin:0 auto;padding:48px 20px 64px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:auto auto;gap:32px 48px;align-items:start}
.h-os .h-txt{grid-column:1;grid-row:1;padding-top:24px;--hmax:112px}
.h-os .h-foto{grid-column:2;grid-row:1 / span 2;aspect-ratio:4/5;border-radius:var(--raio)}
.os{grid-column:1;grid-row:2;background:#fff;color:#1d2125;border:2px solid var(--tinta);border-radius:var(--raio);box-shadow:8px 8px 0 var(--tinta)}
.os-cab{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:12px 16px;border-bottom:2px solid var(--tinta);background:var(--acento);color:#15181B}
.os-cab b{font-family:var(--tit);font-size:22px;${caixa}}.os-cab span{font-size:13px;font-weight:600;text-align:right}
.os ul{list-style:none;margin:0;padding:4px 16px}
.os li{display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px dashed #1d212544}.os li:last-child{border-bottom:0}
.os li div{flex:1}.os li b{display:block;font-size:16px}.os li div span{font-size:14px;color:#5C6166}
.caixa{flex:none;width:22px;height:22px;border:2px solid #1d2125;border-radius:3px;display:grid;place-items:center}
.os-sel{font-size:14px;font-weight:700;text-decoration:none;color:var(--marca);padding:6px 8px;border-radius:var(--raio)}.os-sel:hover{background:color-mix(in srgb,var(--acento) 30%,transparent)}
.os-nota{font-size:13px;color:#5C6166;padding:0 16px 12px}

/* hero agenda */
.h-agenda{max-width:var(--max);margin:0 auto;padding:56px 20px 72px;display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.h-agenda .h-txt{--hmax:116px}
.h-lado{position:relative;padding-bottom:64px}
.h-agenda .h-foto{aspect-ratio:4/5;border-radius:${r.raio > 8 ? "28px" : R}}
.cartao{position:absolute;left:-36px;right:36px;bottom:0;background:var(--papel);border-radius:${r.raio > 8 ? "18px" : R};padding:20px;box-shadow:0 30px 60px -28px color-mix(in srgb,var(--tinta) 65%,transparent);border:1px solid var(--linha)}
.cartao-tit{font-family:var(--tit);font-size:24px;font-weight:700;margin-bottom:8px}
.cartao-prova{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14px;color:var(--suave);margin-bottom:8px}.cartao-prova b{color:var(--tinta)}
.cartao-linha{display:flex;gap:8px;align-items:flex-start;font-size:14px;color:var(--suave);margin-bottom:14px}.cartao-linha svg{flex:none;margin-top:3px;color:var(--marca)}

/* hero vitrine */
.h-vitrine{min-height:min(88vh,780px);display:flex;align-items:flex-end;color:#fff;isolation:isolate}
.h-vitrine .h-foto{position:absolute;inset:0;z-index:-1}
.h-vitrine .h-foto::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05) 30%,rgba(0,0,0,.72) 100%)}
.h-vitrine .tag-foto{top:10px;bottom:auto;z-index:1}
.h-vitrine .h-txt{width:100%;max-width:var(--max);margin:0 auto;padding:120px 20px 64px;--hmax:128px}
.h-vitrine .h-txt>*{max-width:760px}

/* faixa de prova */
.prova{background:var(--tinta);color:var(--papel)}
.faixa-in{max-width:var(--max);margin:0 auto;padding:22px 20px;display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.prova-nota{display:flex;align-items:center;gap:10px}.prova-nota b{font-family:var(--tit);font-size:40px;line-height:1}
.prova .estrelas i{color:color-mix(in srgb,var(--papel) 25%,transparent)}.prova .estrelas i.on{color:#F2B33D}
.prova p{flex:1;min-width:200px}.prova .link-seta{color:var(--papel)}

/* seções */
.sec{padding:88px 20px}
.sec:nth-of-type(even){background:var(--fundo2)}
.sec-in{max-width:var(--max);margin:0 auto}
.nota-serv{font-size:14px;color:var(--suave);margin-top:20px}

/* cardápio */
.quadro{list-style:none;margin:0;padding:32px;background:var(--tinta);color:var(--papel);border-radius:var(--raio);columns:2;column-gap:56px}
.quadro li{display:flex;align-items:baseline;gap:8px;padding:12px 0;break-inside:avoid}
.quadro .item{font-family:var(--tit);font-size:22px;${caixa}}
.quadro .pontos{flex:1;border-bottom:2px dotted color-mix(in srgb,var(--papel) 35%,transparent);transform:translateY(-5px);min-width:16px}
.quadro .desc{font-size:14px;color:color-mix(in srgb,var(--papel) 72%,transparent);text-align:right;max-width:20ch}

/* tabela (barbearia) */
.tabela{list-style:none;margin:0;padding:0;border-top:2px solid var(--tinta)}
.tabela li{display:flex;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--linha)}
.tabela li div{flex:1}.tabela b{display:block;font-family:var(--tit);font-size:24px;${caixa}}.tabela span{color:var(--suave);font-size:15px}
.tabela a,.espec a{display:inline-flex;align-items:center;gap:6px;font-weight:600;text-decoration:none;color:var(--marca);padding:8px 0}
.tabela a:hover,.espec a:hover{text-decoration:underline;text-underline-offset:5px}

/* especialidades */
.espec{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--linha)}
.espec li{padding:28px 28px 24px 0;border-bottom:1px solid var(--linha);display:flex;flex-direction:column;gap:8px}
.espec .ic{width:44px;height:44px;border-radius:${r.raio > 8 ? "50%" : R};display:grid;place-items:center;background:color-mix(in srgb,var(--acento) 30%,transparent);color:var(--marca);margin-bottom:6px}
.espec p{color:var(--suave);font-size:15px;flex:1}

/* categorias */
.categ{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:28px}
.categ li{border-top:3px solid var(--marca);padding-top:16px}.categ h3{${caixa}margin-bottom:6px}.categ p{color:var(--suave);font-size:15px}

/* galeria */
.fotos{display:grid;grid-template-columns:2fr 1fr;grid-template-rows:260px 260px;gap:12px}
.foto{position:relative;padding:0;border:0;background:var(--padrao);border-radius:var(--raio);overflow:hidden;cursor:zoom-in}
.foto img{width:100%;height:100%;object-fit:cover;transition:transform .5s ease}.foto:hover img{transform:scale(1.03)}
.foto.f1{grid-row:span 2}
.caixa-foto{border:0;padding:0;background:transparent;max-width:min(1100px,94vw);max-height:90vh}
.caixa-foto::backdrop{background:rgba(0,0,0,.82)}
.caixa-foto img{max-height:86vh;width:auto;border-radius:6px}
.caixa-foto .fecha{position:absolute;right:8px;top:8px;width:42px;height:42px;border-radius:50%;border:0;background:#fff;color:#111;display:grid;place-items:center;cursor:pointer}

/* diferenciais */
.dif{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:0}
.dif li{display:flex;gap:16px;padding:8px 28px 8px 0}
.dif li+li{border-left:1px solid var(--linha);padding-left:28px}
.dif .ic{flex:none;width:44px;height:44px;border-radius:${r.raio > 8 ? "50%" : R};display:grid;place-items:center;background:var(--marca);color:var(--marca-txt)}
.dif p{color:var(--suave);font-size:15px;margin-top:4px}

/* formulário */
.grade-form{display:grid;grid-template-columns:.9fr 1.1fr;gap:56px;align-items:start}
.grade-form>*,.grade-onde>*,.h-os>*,.h-agenda>*,.form>*{min-width:0}
.form-lado p{font-size:18px;max-width:34ch}.form-lado .fone,.onde .fone{display:flex;gap:8px;align-items:center;margin-top:18px;font-weight:600;font-size:19px}
.form-lado .fone a,.onde .fone a{text-decoration:none}
.form{display:grid;grid-template-columns:1fr 1fr;gap:14px;background:var(--papel);border:1px solid var(--linha);border-radius:${r.raio > 4 ? "16px" : R};padding:26px;box-shadow:var(--sombra)}
.form.sem-wa{display:flex;flex-direction:column;gap:16px}
.campo{display:flex;flex-direction:column;gap:6px;font-size:14px;font-weight:600}
.campo.largo{grid-column:1/-1}
.campo input,.campo select,.campo textarea{font:inherit;font-weight:400;font-size:16px;color:var(--tinta);background:#fff;border:1.5px solid color-mix(in srgb,var(--tinta) 22%,transparent);border-radius:${Math.min(r.raio, 10)}px;padding:12px 13px;min-height:48px;width:100%}
.campo textarea{resize:vertical;min-height:96px}
.campo input:focus,.campo select:focus,.campo textarea:focus{outline:none;border-color:var(--marca);box-shadow:0 0 0 3px color-mix(in srgb,var(--marca) 22%,transparent)}
.campo.erro input{border-color:#C0392B}
.form .btn{grid-column:1/-1;margin-top:4px}
.form-aviso{grid-column:1/-1;font-size:13px;color:var(--suave);text-align:center}
.passos{list-style:none;margin:0;padding:0;counter-reset:p;display:grid;gap:20px}
.passos li{counter-increment:p;display:grid;grid-template-columns:44px 1fr;column-gap:14px}
.passos li::before{content:counter(p);grid-row:span 2;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--marca);color:var(--marca-txt);font-family:var(--tit);font-weight:700;font-size:20px}
.passos b{font-size:18px}.passos span{color:var(--suave);font-size:15px}

/* FAQ */
.perguntas{max-width:820px;border-top:1px solid var(--linha)}
.perguntas details{border-bottom:1px solid var(--linha)}
.perguntas summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 0;font-weight:600;font-size:18px}
.perguntas summary::-webkit-details-marker{display:none}
.perguntas summary svg{flex:none;transition:transform .2s ease;color:var(--marca)}
.perguntas details[open] summary svg{transform:rotate(45deg)}
.perguntas details p{padding:0 0 20px;color:var(--suave);max-width:64ch}

/* onde */
.grade-onde{display:grid;grid-template-columns:1fr 1.25fr;gap:40px;align-items:center}
.onde .end{font-size:19px;max-width:36ch}.onde .acoes{margin-top:24px}
.mapa{border-radius:${r.raio > 4 ? "14px" : R};overflow:hidden;min-height:340px;background:var(--padrao);border:1px solid var(--linha)}
.mapa iframe{width:100%;height:100%;min-height:340px;border:0;display:block}

/* rodapé */
.rodape{background:var(--tinta);color:var(--papel);padding:44px 20px 96px}
.rodape-in{max-width:var(--max);margin:0 auto;display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap}
.rodape-in>div{display:flex;flex-direction:column;gap:4px}.rodape b{font-family:var(--tit);font-size:22px;${caixa}}
.rodape span,.rodape a{opacity:.85}.rodape nav{display:flex;flex-wrap:wrap;gap:18px}.rodape nav a{text-decoration:none}
.assina{max-width:var(--max);margin:28px auto 0;font-size:13px;opacity:.65}
.flut{position:fixed;right:16px;bottom:16px;z-index:30;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:var(--marca);color:var(--marca-txt);box-shadow:0 12px 26px -8px rgba(0,0,0,.45);transition:transform .15s}
.flut:hover{transform:scale(1.05)}.flut.zap{background:#1FAF55;color:#fff}

/* movimento: entrada do topo + revelação discreta na rolagem */
@media (prefers-reduced-motion:no-preference){
  .hero h1{animation:entra .8s cubic-bezier(.2,.7,.2,1) both}
  .hero .chamada,.hero .acoes{animation:entra .8s .12s cubic-bezier(.2,.7,.2,1) both}
  .h-foto img{animation:revela 1.1s cubic-bezier(.2,.7,.2,1) both}
  .selo,.cartao,.os{animation:entra .8s .3s cubic-bezier(.2,.7,.2,1) both}
  .js .rev{opacity:0;transform:translateY(16px);transition:opacity .6s ease,transform .6s ease}
  .js .rev.on{opacity:1;transform:none}
}
@keyframes entra{from{opacity:0;transform:translateY(16px)}}
@keyframes revela{from{transform:scale(1.06)}}

/* celular e tablet */
@media (max-width:980px){
  .menu{position:fixed;inset:66px 0 auto 0;background:var(--papel);flex-direction:column;align-items:stretch;gap:0;padding:8px 20px 20px;border-bottom:1px solid var(--linha);box-shadow:var(--sombra);transform:translateY(-8px);opacity:0;visibility:hidden;transition:opacity .2s,transform .2s,visibility .2s}
  .menu a:not(.btn){padding:14px 0;border-bottom:1px solid var(--linha);font-size:17px}
  .menu .btn{margin-top:14px}
  .topo.aberto .menu{opacity:1;transform:none;visibility:visible}
  .abre-menu{display:block}
  .topo.aberto .abre-menu span:nth-child(1){transform:translateY(7px) rotate(45deg)}
  .topo.aberto .abre-menu span:nth-child(2){opacity:0}
  .topo.aberto .abre-menu span:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
}
@media (max-width:860px){
  .sec{padding:64px 20px}
  .h-letreiro{grid-template-columns:1fr;min-height:0}
  .h-letreiro .h-foto{order:-1;min-height:0;aspect-ratio:4/3}
  .h-painel{justify-content:flex-start}.h-letreiro .h-txt{max-width:none;padding:40px 20px 48px}
  .selo{width:96px;height:96px;left:auto;right:16px;top:auto;bottom:-30px}.selo b{font-size:28px}
  .h-os,.h-agenda{grid-template-columns:1fr;padding-top:24px;gap:28px}
  .h-os .h-foto{grid-column:1;grid-row:auto;order:-1;aspect-ratio:4/3}
  .h-os .h-txt,.os{grid-column:1;grid-row:auto}.h-os .h-txt{padding-top:0}
  .os{box-shadow:5px 5px 0 var(--tinta)}
  .h-lado{order:-1;padding-bottom:0}.h-agenda .h-foto{aspect-ratio:4/3}
  .cartao{position:relative;left:auto;right:auto;margin:-48px 14px 0}
  .h-vitrine{min-height:78vh}.h-vitrine .h-txt{padding:100px 20px 44px}
  .quadro{columns:1;padding:20px}
  .espec{grid-template-columns:1fr}.espec li{padding-right:0}
  .categ{grid-template-columns:1fr 1fr;gap:22px}
  .fotos{grid-template-columns:1fr 1fr;grid-template-rows:auto}.foto{aspect-ratio:1}.foto.f1{grid-column:span 2;grid-row:auto;aspect-ratio:16/10}
  .dif{grid-template-columns:1fr;gap:22px}.dif li,.dif li+li{border-left:0;padding:0}
  .grade-form,.grade-onde{grid-template-columns:1fr;gap:28px}
  .form{grid-template-columns:minmax(0,1fr);padding:20px}
  .tabela li{flex-wrap:wrap}.tabela b{font-size:21px}
}
@media (max-width:420px){.categ{grid-template-columns:1fr}.acoes .btn{flex:1 1 100%}.marca-nome{font-size:16px}}
`;
}

// ---------------------------------------------------------------- comportamento (menu, galeria, formulário, revelação)
const SCRIPT = `
document.documentElement.classList.add('js');
(function(){
  var topo=document.querySelector('.topo'),bt=document.querySelector('.abre-menu');
  if(bt){bt.addEventListener('click',function(){var a=topo.classList.toggle('aberto');bt.setAttribute('aria-expanded',a);bt.setAttribute('aria-label',a?'Fechar menu':'Abrir menu')});
    document.querySelectorAll('.menu a').forEach(function(a){a.addEventListener('click',function(){topo.classList.remove('aberto');bt.setAttribute('aria-expanded','false')})});}
  document.querySelectorAll('[data-servico]').forEach(function(a){a.addEventListener('click',function(){var s=document.querySelector('.form select[name=servico]');if(s){s.value=a.getAttribute('data-servico');}setTimeout(function(){var n=document.querySelector('.form [name=nome]');if(n)n.focus({preventScroll:true})},450)})});
  var dlg=document.querySelector('.caixa-foto');
  document.querySelectorAll('[data-amplia]').forEach(function(b){b.addEventListener('click',function(){if(!dlg||!dlg.showModal){window.open(b.getAttribute('data-amplia'),'_blank');return}dlg.querySelector('img').src=b.getAttribute('data-amplia');dlg.querySelector('img').alt=b.getAttribute('aria-label').replace('Ampliar foto: ','');dlg.showModal()})});
  if(dlg){dlg.addEventListener('click',function(e){if(e.target===dlg||e.target.closest('.fecha'))dlg.close()})}
  var f=document.querySelector('.form[data-wa]');
  if(f){f.addEventListener('submit',function(e){e.preventDefault();var nome=f.querySelector('[name=nome]');
    if(!nome.value.trim()){nome.parentNode.classList.add('erro');nome.focus();return}nome.parentNode.classList.remove('erro');
    var linhas=['Olá! Vim pelo site de '+f.getAttribute('data-nome')+'.'];
    f.querySelectorAll('input,select,textarea').forEach(function(c){var v=(c.value||'').trim();if(v){var r=c.parentNode.querySelector('span');linhas.push('*'+(r?r.textContent:c.name)+':* '+v)}});
    window.open('https://wa.me/'+f.getAttribute('data-wa')+'?text='+encodeURIComponent(linhas.join('\\n')),'_blank','noopener')})}
  var rev=document.querySelectorAll('.rev');
  if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('on');io.unobserve(x.target)}})},{threshold:.08,rootMargin:'0px 0px -40px 0px'});rev.forEach(function(e){io.observe(e)})}else{rev.forEach(function(e){e.classList.add('on')})}
})();`;

function jsonLD(x, l) {
  const o = { "@context": "https://schema.org", "@type": "LocalBusiness", name: x.nome };
  if (l.endereco) o.address = { "@type": "PostalAddress", streetAddress: l.endereco, addressLocality: l.cidade || undefined, addressRegion: l.uf || undefined, addressCountry: "BR" };
  if (l.telefone) o.telephone = l.telefone;
  if (x.temNota) o.aggregateRating = { "@type": "AggregateRating", ratingValue: Number(l.nota), reviewCount: Number(l.avaliacoes) };
  return JSON.stringify(o).replace(/</g, "\\u003c");
}

export function renderDemo(l, { preview = false } = {}) {
  const x = dados(l);
  const desc = `${x.t.rotulo}${x.lugar ? ` em ${x.lugar}` : ""}. ${x.t.chamada}${x.temNota ? ` Nota ${notaBR(l.nota)} no Google.` : ""}`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(x.nome)} | ${esc(x.t.rotulo)}${l.bairro ? ` em ${esc(l.bairro)}` : ""}</title>
<meta name="description" content="${esc(desc)}"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="${x.d.marca}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preconnect" href="https://images.unsplash.com">
<link href="${x.d.fontes}" rel="stylesheet">
<style>${css(x)}</style>
<script type="application/ld+json">${jsonLD(x, l)}</script></head>
<body class="seg-${esc(l.nicho || "generico")}">
<div class="demo-aviso"><b>Demonstração</b> criada para ${esc(x.nome)}. Não é o site oficial.${preview ? " (pré-visualização)" : ""}</div>
${montar(x, l)}
<script>${SCRIPT}</script>
</body></html>`;
}
