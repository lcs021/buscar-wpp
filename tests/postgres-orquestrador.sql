DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.operacao_jobs', 'INSERT') THEN
    RAISE EXCEPTION 'users must enqueue through the validated RPC';
  END IF;
  IF has_function_privilege('authenticated', 'public.claim_operacao_jobs(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'users must not claim operation jobs';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.claim_operacao_jobs(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role must claim operation jobs';
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
INSERT INTO public.operacao_config (user_id, enabled, paused, starts_at, ends_at, weekdays, daily_limit, max_concurrency)
VALUES ('00000000-0000-4000-8000-000000000001', true, false, '00:00', '23:59:59.999',
  ARRAY[extract(isodow from (now() at time zone 'America/Sao_Paulo'))::smallint], 50, 1)
ON CONFLICT (user_id) DO UPDATE SET enabled = true, paused = false, starts_at = '00:00', ends_at = '23:59:59.999',
  weekdays = excluded.weekdays, daily_limit = 50, max_concurrency = 1;

DO $$
DECLARE
  first_id uuid;
  duplicate_id uuid;
  second_id uuid;
  claimed_id uuid;
  claimed_count integer;
  job_state text;
  attempts_count integer;
BEGIN
  first_id := public.enfileirar_pesquisa(
    '{"tipo":"barbearia","cidade":"Campinas","uf":"SP","quantidade":20}'::jsonb,
    now(), '00000000-0000-4000-8000-000000000011');
  duplicate_id := public.enfileirar_pesquisa(
    '{"tipo":"dentista","cidade":"Santos","uf":"SP","quantidade":10}'::jsonb,
    now(), '00000000-0000-4000-8000-000000000011');
  IF duplicate_id <> first_id THEN RAISE EXCEPTION 'request key must be idempotent'; END IF;

  second_id := public.enfileirar_pesquisa(
    '{"tipo":"dentista","cidade":"Santos","uf":"SP","quantidade":10}'::jsonb,
    now(), '00000000-0000-4000-8000-000000000012');
  BEGIN
    PERFORM public.enfileirar_pesquisa(
      '{"tipo":"barbearia","cidade":"Campinas","uf":"XX","quantidade":20}'::jsonb,
      now(), '00000000-0000-4000-8000-000000000013');
    RAISE EXCEPTION 'invalid UF should be rejected';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'invalid UF should be rejected' THEN RAISE; END IF;
  END;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
  IF (SELECT count(*) FROM public.operacao_jobs) <> 0 THEN RAISE EXCEPTION 'jobs must be tenant isolated'; END IF;
END $$;
RESET ROLE;

SET ROLE service_role;
DO $$
DECLARE
  claimed uuid;
  claimed_count integer;
  job_state text;
  attempts_count integer;
BEGIN
  SELECT id INTO claimed FROM public.claim_operacao_jobs(10) LIMIT 1;
  IF claimed IS NULL THEN RAISE EXCEPTION 'enabled due task should be claimed'; END IF;
  SELECT count(*) INTO claimed_count FROM public.operacao_jobs WHERE status = 'running';
  IF claimed_count <> 1 THEN RAISE EXCEPTION 'concurrency limit should allow one running job'; END IF;
  IF EXISTS (SELECT 1 FROM public.claim_operacao_jobs(10)) THEN RAISE EXCEPTION 'concurrency limit should block another claim'; END IF;

  PERFORM public.finalizar_operacao_job(claimed, false, '{}'::jsonb, 'temporary failure');
  SELECT status, attempts INTO job_state, attempts_count FROM public.operacao_jobs WHERE id = claimed;
  IF job_state <> 'queued' OR attempts_count <> 1 THEN RAISE EXCEPTION 'failed jobs should retry with an attempt recorded'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.operacao_runs WHERE job_id = claimed AND attempt = 1 AND status = 'failed') THEN
    RAISE EXCEPTION 'every worker attempt must be logged';
  END IF;
END $$;
RESET ROLE;

