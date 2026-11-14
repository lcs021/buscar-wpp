SET ROLE service_role;
DO $$
DECLARE
  v_user uuid := '00000000-0000-4000-8000-000000000001';
  v_job uuid := '00000000-0000-4000-8000-000000000099';
  v_claimed uuid;
  v_status text;
  v_attempt integer;
  v_error text;
BEGIN
  INSERT INTO public.operacao_config
    (user_id, enabled, paused, starts_at, ends_at, weekdays, daily_limit, max_concurrency)
  VALUES (v_user, true, false, '00:00', '23:59:59.999',
    ARRAY[extract(isodow from (now() at time zone 'America/Sao_Paulo'))::smallint], 50, 1)
  ON CONFLICT (user_id) DO UPDATE SET enabled = true, paused = false,
    starts_at = '00:00', ends_at = '23:59:59.999',
    weekdays = excluded.weekdays, daily_limit = 50, max_concurrency = 1;

  UPDATE public.operacao_jobs SET next_run_at = now() + interval '1 hour'
    WHERE status = 'queued';
  INSERT INTO public.operacao_jobs
    (id, user_id, kind, payload, request_key, max_attempts, scheduled_at, next_run_at)
  VALUES (v_job, v_user, 'search', '{"tipo":"fixture"}'::jsonb,
    '00000000-0000-4000-8000-000000000099', 3, now(), now());

  SELECT id INTO v_claimed FROM public.claim_operacao_jobs(1);
  IF v_claimed IS DISTINCT FROM v_job THEN RAISE EXCEPTION 'fixture job was not claimed'; END IF;

  PERFORM public.finalizar_operacao_job(v_job, false, '{}'::jsonb, 'Places indisponível');
  SELECT status, attempts, last_error INTO v_status, v_attempt, v_error
    FROM public.operacao_jobs WHERE id = v_job;
  IF v_status <> 'queued' OR v_attempt <> 1 OR v_error <> 'Places indisponível' THEN
    RAISE EXCEPTION 'failed close must persist the error and queue a retry';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.operacao_runs
    WHERE job_id = v_job AND attempt = 1 AND status = 'failed' AND error = 'Places indisponível') THEN
    RAISE EXCEPTION 'first attempt error was not recorded';
  END IF;

  UPDATE public.operacao_jobs SET next_run_at = now() WHERE id = v_job;
  SELECT id INTO v_claimed FROM public.claim_operacao_jobs(1);
  IF v_claimed IS DISTINCT FROM v_job THEN RAISE EXCEPTION 'retry attempt was not claimed'; END IF;
  UPDATE public.operacao_jobs SET lease_until = now() - interval '1 second' WHERE id = v_job;
  PERFORM public.claim_operacao_jobs(1);

  SELECT status, attempts, last_error INTO v_status, v_attempt, v_error
    FROM public.operacao_jobs WHERE id = v_job;
  IF v_status <> 'queued' OR v_attempt <> 2 OR v_error <> 'worker lease expired' THEN
    RAISE EXCEPTION 'expired lease must queue a retry and record the recovery reason';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.operacao_runs
    WHERE job_id = v_job AND attempt = 2 AND status = 'failed' AND error = 'worker lease expired') THEN
    RAISE EXCEPTION 'expired attempt was not recorded';
  END IF;

  UPDATE public.operacao_jobs SET next_run_at = now() WHERE id = v_job;
  SELECT id INTO v_claimed FROM public.claim_operacao_jobs(1);
  IF v_claimed IS DISTINCT FROM v_job THEN RAISE EXCEPTION 'final attempt was not claimed'; END IF;
  PERFORM public.finalizar_operacao_job(v_job, false, '{}'::jsonb, 'falha definitiva');
  SELECT status, attempts INTO v_status, v_attempt FROM public.operacao_jobs WHERE id = v_job;
  IF v_status <> 'failed' OR v_attempt <> 3 THEN RAISE EXCEPTION 'last failed attempt must stop retrying'; END IF;
END $$;
RESET ROLE;
