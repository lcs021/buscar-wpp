import {
  classificarSite,
  ErroBusca,
  validarEntradaBusca,
} from "../supabase/functions/buscar-empresas/index.ts";

function assertEquals(actual: unknown, expected: unknown, message = "values differ") {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

Deno.test("site classifier compares parsed hostnames rather than arbitrary URL text", () => {
  assertEquals(classificarSite("https://instagram.com/loja").status_site, "instagram");
  assertEquals(classificarSite("https://sub.instagram.com/loja").status_site, "instagram");
  assertEquals(classificarSite("https://wa.me/5511999999999").whatsapp, "5511999999999");
  assertEquals(classificarSite("https://ifood.com.br/restaurante").status_site, "link_agregador");
  assertEquals(classificarSite("https://loja.example/instagram.com").status_site, "com_site");
  assertEquals(classificarSite("https://instagram.com.evil.example").status_site, "com_site");
  assertEquals(classificarSite("https://loja.example/path/ifood.com.br").status_site, "com_site");
  assertEquals(classificarSite("javascript:alert(1)").status_site, "sem_site");
});

Deno.test("search inputs enforce Brazilian UF, text bounds, and quantity", () => {
  assertEquals(validarEntradaBusca({ tipo: "barbearia", cidade: "Campinas", uf: "sp" }).quantidade, 20);
  assertEquals(validarEntradaBusca({ tipo: "barbearia", cidade: "Campinas", uf: "SP", quantidade: 60 }).quantidade, 60);
  const invalid = [
    { tipo: "barbearia", cidade: "Campinas", uf: "XX" },
    { tipo: "barbearia", cidade: "Campinas", uf: "SP", quantidade: 0 },
    { tipo: "barbearia", cidade: "Campinas", uf: "SP", quantidade: 61 },
    { tipo: "barbearia", cidade: "Campinas", uf: "SP", quantidade: 2.5 },
    { tipo: "barbearia", cidade: "Campinas", uf: "SP", quantidade: "20" },
    { tipo: "barbearia", cidade: "x".repeat(101), uf: "SP" },
    { tipo: "barbearia\nfoo", cidade: "Campinas", uf: "SP" },
    { tipo: "barbearia", cidade: "Campinas", uf: "SP", bairro: "x".repeat(101) },
  ];
  for (const input of invalid) {
    let error: unknown;
    try { validarEntradaBusca(input); } catch (caught) { error = caught; }
    assertEquals(error instanceof ErroBusca, true, "invalid input must be rejected");
  }
});

