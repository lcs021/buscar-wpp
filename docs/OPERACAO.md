# Operacao agendada

## O que o orquestrador faz

O orquestrador processa somente pesquisas de empresas previamente colocadas na fila pelo usuario. Ele nao envia WhatsApp, nao publica previews comerciais e nao inicia contato com empresas. O envio atual continua dependendo do clique humano no painel. A fila respeita America/Sao_Paulo, os dias e horarios da configuracao, o limite diario por usuario, ate tres tarefas simultaneas e o limite de cinco chamadas de busca por minuto por usuario.

O banco grava cada tarefa e cada tentativa. Falhas tentam novamente ate tres vezes, com espera crescente. Tarefas pendentes ficam paradas fora do expediente, quando pausadas ou quando o limite diario foi atingido; o cron tecnico pode continuar ativo para retomar as tarefas no proximo horario permitido.

## Preparacao

1. Aplique `supabase/migrations/20261114100000_operacao_agendada.sql` depois das migracoes existentes. O fluxo fica desativado e pausado por padrao.
2. Publique as Edge Functions `buscar-empresas` e `orquestrador` e mantenha os segredos abaixo no gerenciador de segredos do Supabase, nunca no repositorio nem no frontend:
   - `GOOGLE_PLACES_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ORQUESTRADOR_CRON_SECRET` (segredo aleatorio com pelo menos 32 caracteres)
3. Ative as extensoes `pg_cron`, `pg_net` e `Vault` no projeto Supabase.
4. Na tela do Vault, guarde dois segredos chamados `orquestrador_project_url` e `orquestrador_cron_secret`. Use a URL do projeto e o mesmo valor de `ORQUESTRADOR_CRON_SECRET` configurado para a Edge Function.
5. Execute o SQL abaixo uma vez no SQL Editor do Supabase. Nao cole o valor do segredo aqui; o cron le os valores do Vault.

```sql
select cron.schedule(
  'ai-website-prospecting-orquestrador',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'orquestrador_project_url') || '/functions/v1/orquestrador',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'orquestrador_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);
```

Confira o resultado em Supabase Dashboard > Integrations > Cron e nos logs da Edge Function. O Supabase documenta esse padrao de Cron + `pg_net` + Vault para chamar Edge Functions periodicamente: https://supabase.com/docs/guides/functions/schedule-functions.

## Operar pelo painel

Abra **Operacao**, defina os dias, horario, limite diario e concorrencia, depois habilite a operacao. A pausa pode ser ativada a qualquer momento e deixa as tarefas na fila. Cada tarefa pode ser agendada para agora ou para uma data futura (ate 30 dias). A pagina mostra status, tentativas, resumo de resultados e falha mais recente.

Se a migracao ainda nao foi aplicada, o painel informa a pendencia. A fila depende do cron externo acima; a interface nao deve ser considerada pronta para execucao ate que o cron tenha sido publicado e um teste de tarefa apareca nos logs.

## Limites deliberados

- O worker aceita apenas tarefas de pesquisa e usa a chave Places do servidor.
- A plataforma nao implementa a WhatsApp Business Platform oficial neste fluxo. Nao envie mensagens automaticas: ainda e preciso configurar a integracao oficial, templates aprovados, criterios de elegibilidade e consentimento, opt-out e registro no CRM.
- Revisao e aprovacao comercial de previews continuam humanas; nao existe uma etapa de aprovacao automatizada no worker.
- Segredos, chaves de servico, cron e credenciais de producao nao foram provisionados nem usados por esta mudanca.

