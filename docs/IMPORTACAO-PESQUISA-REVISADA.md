# Ingestão de pesquisas revisadas

A RPC `public.importar_pesquisa_revisada` grava o candidato no Lead Finder e sua proveniência na mesma transação. O registro sempre começa com `qualificado=false`; `url_not_reported` e `inconclusive` viram `status_site=inconclusivo`, nunca `sem_site`. Cada importação requer URL e título por fonte, instante observado, classificação explícita e chaves de idempotência/deduplicação.

## Autorização e operação

- A chamada usa JWT de usuário Supabase. A conta também precisa estar em `public.research_reviewers`; esse cadastro não é legível nem editável por usuários autenticados.
- O proprietário do projeto deve inserir o UUID da conta revisora por `service_role` após validar a pessoa autorizada. A lista vazia bloqueia todas as importações.
- A operação de importação foi implementada como RPC autenticada para integração futura pelo encaminhador de resultados aprovados. O orquestrador/cron remoto ainda precisa ser provisionado e configurado; esta PR não o ativa nem configura segredo.
- O lote de pesquisa atual não é submetido: a auditoria aprovou zero oportunidades sem website. Evidências de presença ou inconclusivas não são oportunidades qualificadas.

## Reversão/limites

A migração altera apenas o schema e as permissões; não chama serviço remoto nem importa dados. O CI usa somente fixtures sintéticas. O papel `authenticated` perde UPDATE de tabela inteira em `leads`; atualizações comuns permanecem limitadas aos campos de estado operacional concedidos na migração. A confirmação de site passa pela RPC com verificação de proprietário.
