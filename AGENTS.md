# Lead Finder (buscar-wpp): guia para agentes de código (Codex, Claude Code etc.)

Sistema do Lucas para prospectar comércios sem site no estado do RJ: acha empresas, gera um site demo para cada uma e prepara a mensagem de WhatsApp. **O envio é sempre manual, um toque por empresa.**

## Onde fica cada coisa
- Painel: https://lcs021.github.io/buscar-wpp/ (GitHub Pages, publica `web/` a cada push na `main`, via `.github/workflows/pages.yml`; o workflow acrescenta `?v=<commit>` nos imports para furar o cache).
- Banco: Supabase, projeto `koovtpweertxrxeaqujc`. `web/config.js` tem só a URL e a chave **publishable**. Nunca coloque a chave secret/service_role no código.
- `supabase/migrations/`: tabelas `perfis`, `buscas`, `leads` (RLS por `user_id`), função pública `demo_publica(p_slug, p_contar)` usada pelos sites demo, planos/valores em `perfis.planos`, `leads.site_demo`.
- `supabase/functions/buscar-empresas/index.ts`: busca no Google Places (opcional; a chave `GOOGLE_PLACES_API_KEY` não está configurada, o Lucas usa cadastro manual/CSV).
- `extensao/`: extensão Manifest V3 para Chrome/Brave; abre Maps e coleta fichas públicas sem API paga. `web/navegador.js` valida e importa; `tools/empacotar-extensao.py` gera o ZIP público no deploy do Pages. Nenhum token/senha passa para a extensão.
- `web/` (JS puro, módulos ES, sem build):
  - `index.html` + `app.js` + `app.css`: painel (Dashboard, Buscar, Adicionar empresas/CSV, Fila de envio, Leads com ações em massa, Configurações com planos).
  - `sb.js`: cliente mínimo do Supabase (login, `db()`, `funcao()`, `rpcPublica()`).
  - `shared.js`: temas por ramo, qualificação, leitura de CSV, mensagens (`mensagem`, `ESTILOS`, `mensagemEstilo`), `linkSite`.
  - `demo.html` + `demo-render.js`: site demo por ramo (16 ramos; paleta, fotos, frase e composição variam pelo hash da empresa).
  - `site.html` + `site-render.js`: site "cinematográfico" por lead (é o link que vai na mensagem). `tools/gerar-sites.mjs` gera versões estáticas em `web/s/<slug>/`.

## Regras do negócio (não quebrar)
1. Nada de envio automático de WhatsApp. O botão abre `wa.me` com o texto pronto; o Lucas aperta enviar.
2. Não inventar dados: avaliações, depoimentos, números, prêmios, preços. Fotos de banco de imagem marcadas como ilustrativas.
3. Preço nunca aparece no site, só nas mensagens (estilos "preco" e "proposta", a partir de `perfis.planos`).
4. A mensagem não diz de onde o Lucas é. Termina pedindo desculpa caso a empresa já tenha site.
5. Empresa com site próprio ou com link de agenda/pedido na ficha não é qualificada (`status_site` `com_site`/`link_agregador`). Na dúvida, fora.
6. Candidatos da extensão (`busca_termo` começa com `navegador:`) entram com `qualificado=false`, para revisão. Só o botão **Conferi: não tem site** libera a fila se os filtros ainda forem atendidos. Não presumir ausência de site pelo botão ausente, nem inventar nota/avaliações quando o Maps limita a exibição. Parar em consentimento/CAPTCHA; não contornar.
7. Site demo sempre com a faixa "Demonstração… não é o site oficial" e `noindex`; sai do ar quando o lead é excluído ou `demo_publicada = false`.

## Como testar
- Servir local: `cd web && python3 -m http.server 8765` e abrir `http://localhost:8765/` (o login usa o Supabase real; para testes, simule as rotas do Supabase com Playwright).
- Sites demo: renderize `renderDemo(lead)` / `renderSite(lead, opts)` em Node (`globalThis.location = { href: "https://x/" }` antes do import) e confira em 360, 390, 820 e 1280 px: sem rolagem lateral, menu, formulário → wa.me, lightbox, FAQ.
- Antes de publicar: `node --check web/*.js`.

## Estado atual (14/11/2026)
- ~117 leads no RJ (Rio, Baixada, Niterói, São Gonçalo, Macaé, Cabo Frio, Petrópolis, Volta Redonda), 24 tirados por já terem site/agenda; fila com ~61.
- Fila tem "Conferir no Google" e "Já tem site". Leads tem seleção em massa (excluir / tirar sites do ar).
- Pendente/ideias: busca automática diária (precisa da chave do Google + pg_cron), relatório de quem abriu o site, migração `20261112000000_site_demo.sql` aplicada no Supabase em 15/11/2026; função buscar-empresas v2 publicada. A chave Google continua ausente; a alternativa gratuita é a extensão.

Commits: mensagens em português, curtas, dizendo o que mudou para o usuário.

## Verificação da extensão
- `node --test tests/*.test.mjs` cobre a importação, deduplicação, isolamento da ponte, cancelamento e verificações do Google.
- `for arquivo in web/*.js extensao/*.js; do node --check "$arquivo" || exit 1; done`.
- Para atualizar o ZIP local: `python3 tools/empacotar-extensao.py`; o Pages gera automaticamente a versão pública.

Validação da versão 1.0.0: 14 testes de Node e teste de painel no Chromium com ponte da extensão simulada, incluindo importação, revisão e 390 px. Leitor conferido também em ficha pública real (Maps limitado, sem contagem de avaliações). O navegador deste ambiente bloqueia carregar extensões por política administrativa; execução completa com extensão instalada ainda deve ser validada no Chrome/Brave do usuário.
