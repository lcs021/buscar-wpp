# Resumo para colar na conversa nova (skill "Site de 10K")

Use a skill **Site de 10K** para criar um site para cada empresa da minha lista de leads e para as próximas que entrarem no sistema.

## O sistema que já existe
- Repositório: **lcs021/buscar-wpp** (anexe com acesso de push). Painel publicado em https://lcs021.github.io/buscar-wpp/
- Banco: Supabase, projeto "sistema propecção" (ref `koovtpweertxrxeaqujc`). Tabela `public.leads` com RLS por usuário.
  Campos úteis: `nome, categoria, nicho, telefone, celular, whatsapp, endereco, bairro, cidade, uf, maps_url, instagram, facebook, nota, avaliacoes, slug, status, qualificado`.
- Hoje cada lead tem um site **demo** gerado no navegador: `web/demo.html?s=<slug>` → RPC `demo_publica` → `web/demo-render.js`
  (16 ramos, paleta/fotos/frase/composição variam por empresa, faixa "Demonstração… não é o site oficial", noindex).
- São 40 leads em Nova Iguaçu (RJ): barbearias, salões, manicure, dentistas, oficinas, lava-jato, pizzarias, hamburguerias, restaurantes, academias, pet, padaria, açaí.

## Regras que valem para os sites novos
- **Não inventar dados**: nada de depoimentos, números, certificações ou preços que a empresa não deu. Nota/avaliações, endereço e telefone vêm da ficha pública do Google.
- **Preços nunca no site** — valores só vão na mensagem de WhatsApp (planos ficam em `perfis.planos`).
- Fotos/vídeos gerados por IA ou de banco de imagens devem ser marcados como ilustrativos até o cliente mandar os dele.
- Enquanto a empresa não fechar, o site é **demonstração** (faixa avisando e `noindex`).
- Envio de WhatsApp continua manual (um clique por vez), nunca automático.
- Senhas, chaves e logins (Supabase, Higgsfield, HostGator) eu mesmo coloco; não peça para digitar por mim.

## O que quero
1. Um site no padrão da skill para cada lead da lista (começar pelos qualificados).
2. Cada site novo ligado ao lead no sistema (ex.: guardar a URL em `leads.site_demo` ou similar) para o link ir na mensagem do WhatsApp no lugar do demo atual.
3. Para leads que entrarem depois, o mesmo fluxo.
