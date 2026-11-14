import { csvCell } from "../web/csv.js";
import { safeHttpUrl } from "../web/url.js";
import { montarLead } from "../web/shared.js";
import { renderDemo } from "../web/demo-render.js";
import { renderSite } from "../web/site-render.js";
import {
  ErroBusca,
  executarBusca,
} from "../supabase/functions/buscar-empresas/index.ts";

function assertEquals(
  actual: unknown,
  expected: unknown,
  message = "valores diferentes",
) {
  if (actual !== expected) {
    throw new Error(
      `${message}: esperado ${String(expected)}, recebido ${String(actual)}`,
    );
  }
}

Deno.test("URLs clicáveis aceitam HTTP(S) absoluto e rejeitam esquemas executáveis", () => {
  assertEquals(safeHttpUrl("https://example.com/a"), "https://example.com/a");
  assertEquals(safeHttpUrl("http://example.com"), "http://example.com/");
  assertEquals(safeHttpUrl("javascript:alert(1)"), "");
  assertEquals(safeHttpUrl("data:text/html,<script>alert(1)</script>"), "");
  assertEquals(safeHttpUrl("//example.com"), "");
  assertEquals(safeHttpUrl("https://user:pass@example.com"), "");
});

Deno.test("importação e demos públicas descartam destinos não HTTP(S)", () => {
  const lead = montarLead({
    nome: "Loja de teste",
    telefone: "(11) 99999-9999",
    nicho: "generico",
    maps_url: "javascript:alert(1)",
    instagram: "javascript:alert(2)",
    facebook: "data:text/html,<script>alert(3)</script>",
  });
  assertEquals(lead.maps_url, "");
  assertEquals(lead.instagram, "");
  assertEquals(lead.facebook, "");

  const htmlDemo = renderDemo({ ...lead, slug: "teste12345" });
  const htmlSite = renderSite({ ...lead, slug: "teste12345" });
  assertEquals(htmlDemo.includes("javascript:"), false);
  assertEquals(htmlSite.includes("javascript:"), false);
  assertEquals(htmlDemo.includes("data:text/html"), false);
  assertEquals(htmlSite.includes("data:text/html"), false);
});

Deno.test("CSV neutraliza fórmulas e preserva escaping de aspas", () => {
  assertEquals(csvCell("=1+1"), `"'=1+1"`);
  assertEquals(csvCell("  @SUM(A1:A2)"), `"'  @SUM(A1:A2)"`);
  assertEquals(csvCell('texto "normal"'), `"texto ""normal"""`);
  assertEquals(csvCell("-3"), `"'-3"`);
});

Deno.test("busca bloqueada pela cota não chama Google Places", async () => {
  const originalFetch = globalThis.fetch;
  let chamadaGoogle = false;
  let chamadaLimite = false;
  globalThis.fetch = (input) => {
    const url = String(input);
    if (url.endsWith("/auth/v1/user")) {
      return Promise.resolve(
        Response.json({ id: "00000000-0000-4000-8000-000000000001" }),
      );
    }
    if (url.includes("/rest/v1/perfis?")) {
      return Promise.resolve(
        Response.json([{ nota_minima: 4.5, avaliacoes_minimas: 20 }]),
      );
    }
    if (url.includes("/rest/v1/rpc/limitar_busca")) {
      chamadaLimite = true;
      return Promise.resolve(Response.json(false));
    }
    if (url.includes("places.googleapis.com")) chamadaGoogle = true;
    throw new Error(`chamada inesperada no teste: ${url}`);
  };

  try {
    let erro: unknown;
    try {
      await executarBusca(
        {
          url: "https://supabase.example",
          apikey: "public",
          auth: "Bearer test",
        },
        "places-key",
        {
          tipo: "barbearia",
          cidade: "Campinas",
          uf: "SP",
          quantidade: 20,
        },
      );
    } catch (e) {
      erro = e;
    }
    assertEquals(erro instanceof ErroBusca, true, "deve lançar ErroBusca");
    assertEquals((erro as ErroBusca).status, 429, "deve retornar status 429");
    assertEquals(chamadaLimite, true, "deve consultar o limite");
    assertEquals(chamadaGoogle, false, "não deve chamar Places após bloqueio");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
