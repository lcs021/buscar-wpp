import { renderDemo } from "../web/demo-render.js";
import { renderSite } from "../web/site-render.js";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function includes(value: string, fragment: string) {
  assert(value.includes(fragment), `missing expected text: ${fragment}`);
}
function excludes(value: string, fragment: string) {
  assert(!value.includes(fragment), `unexpected text: ${fragment}`);
}
const fixture = (overrides: Record<string, unknown> = {}) => ({
  slug: "synthetic-demo-0001",
  place_id: "synthetic-place-0001",
  nome: "Oficina Exemplo",
  categoria: "Oficina mecânica",
  nicho: "oficina",
  telefone: "(21) 99999-0000",
  celular: true,
  whatsapp: "",
  endereco: "Rua de Teste, 123",
  bairro: "Centro",
  cidade: "Cidade Fictícia",
  uf: "RJ",
  maps_url: "https://maps.example.invalid/demo",
  instagram: "",
  facebook: "",
  nota: null,
  avaliacoes: null,
  ...overrides,
});

Deno.test("both renderers always mark pages as unofficial and noindex", () => {
  for (const html of [renderDemo(fixture()), renderSite(fixture()), renderSite(fixture(), { preview: true })]) {
    includes(html, '<meta name="robots" content="noindex,nofollow">');
    includes(html, "Não é o site oficial.");
    includes(html, "Textos promocionais e serviços são exemplos; confirme os dados antes de usar.");
  }
});

Deno.test("both renderers escape synthetic lead fields in markup and JSON-LD", () => {
  const lead = fixture({ nome: 'Oficina <img src=x onerror="alert(1)"> & Cia' });
  for (const html of [renderDemo(lead), renderSite(lead)]) {
    includes(html, "&lt;img");
    includes(html, "&amp; Cia");
    excludes(html, '<img src=x onerror="alert(1)">');
    excludes(html, 'onerror="alert(1)"');
  }
});

Deno.test("an inferred mobile phone is not presented as verified WhatsApp availability", () => {
  const lead = fixture({ celular: true, whatsapp: "" });
  for (const html of [renderDemo(lead), renderSite(lead)]) {
    excludes(html, "Atendimento pelo WhatsApp");
    excludes(html, "wa.me/5521999990000");
    includes(html, "Atendimento por telefone");
  }
});

Deno.test("pages do not invent ratings or testimonials when the fixture has none", () => {
  const lead = fixture({ nota: null, avaliacoes: null });
  for (const html of [renderDemo(lead), renderSite(lead)]) {
    excludes(html, "aggregateRating");
    excludes(html, "reviewCount");
    excludes(html, "Depoimentos");
  }
});

Deno.test("an explicitly supplied WhatsApp listing remains available as a contact option", () => {
  const lead = fixture({ whatsapp: "5521999990000" });
  includes(renderDemo(lead), "wa.me/5521999990000");
  includes(renderSite(lead), "wa.me/5521999990000");
});
