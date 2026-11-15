DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.osm_reservar_pesquisa(uuid,uuid,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.osm_concluir_pesquisa(uuid,uuid,jsonb,timestamptz)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.osm_falhar_pesquisa(uuid,uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.osm_recuperar_reservas_abandonadas(integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'OSM quota RPCs must not be directly callable by clients';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.osm_reservar_pesquisa(uuid,uuid,text,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service role must call OSM quota RPCs';
  END IF;
  IF has_table_privilege('authenticated', 'public.osm_search_daily_usage', 'SELECT')
     OR has_table_privilege('authenticated', 'public.osm_search_requests', 'INSERT') THEN
    RAISE EXCEPTION 'OSM quota and cached results must remain private';
  END IF;
END $$;

SET ROLE service_role;
DO $$
DECLARE
  v_user uuid := '00000000-0000-4000-8000-000000000001';
  v_other uuid := '00000000-0000-4000-8000-000000000002';
  v_key uuid := '10000000-0000-4000-8000-000000000001';
  v_response jsonb;
  v_used integer;
  v_recovered integer;
  i integer;
BEGIN
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'state' <> 'reserved' OR v_response->>'cached' <> 'false' THEN
    RAISE EXCEPTION 'first query must reserve one global daily call';
  END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'cached' <> 'true' OR v_response->>'state' <> 'reserved' THEN
    RAISE EXCEPTION 'same idempotency key must not create another reservation';
  END IF;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 1 THEN RAISE EXCEPTION 'idempotent retry consumed another global call'; END IF;

  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Belém', 'PA', 'veterinaria');
    RAISE EXCEPTION 'reused idempotency key with different filters was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  -- An empty, successful search still consumes its one source-call quota unit.
  v_response := public.osm_concluir_pesquisa(v_user, v_key, '[]'::jsonb, now());
  IF v_response->>'state' <> 'completed' OR jsonb_array_length(v_response->'results') <> 0 THEN
    RAISE EXCEPTION 'empty source result should complete as an empty inconclusive search';
  END IF;
  v_response := public.osm_concluir_pesquisa(v_user, v_key, '[]'::jsonb, now());
  IF v_response->>'cached' <> 'true' THEN RAISE EXCEPTION 'empty completion retry must be idempotent'; END IF;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 1 THEN RAISE EXCEPTION 'empty result must not release daily call quota'; END IF;

  -- Quota is shared between distinct reviewer accounts.
  v_key := '10000000-0000-4000-8000-000000000002';
  PERFORM public.osm_reservar_pesquisa(v_other, v_key, 'Recife', 'PE', 'veterinaria');
  v_response := public.osm_falhar_pesquisa(v_other, v_key, 'source_timeout');
  IF v_response->>'state' <> 'failed' OR v_response->>'failure_code' <> 'source_timeout' THEN
    RAISE EXCEPTION 'source failure code was not recorded';
  END IF;
  v_response := public.osm_reservar_pesquisa(v_other, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'cached' <> 'true' OR v_response->>'state' <> 'failed' THEN
    RAISE EXCEPTION 'failed idempotent request must not call source again';
  END IF;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 2 THEN RAISE EXCEPTION 'failed call must remain charged globally'; END IF;

  -- A failed result-finalization leaves a reservation; recovery records ambiguity and retains quota.
  v_key := '10000000-0000-4000-8000-000000000003';
  PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  BEGIN
    PERFORM public.osm_concluir_pesquisa(v_user, v_key, jsonb_build_array(jsonb_build_object('phone', 'synthetic')), now());
    RAISE EXCEPTION 'invalid finalization payload was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  UPDATE public.osm_search_requests SET reservation_expires_at = now() - interval '1 second'
   WHERE user_id = v_user AND request_key = v_key;
  v_response := public.osm_recuperar_reservas_abandonadas(100);
  v_recovered := (v_response->>'recovered')::integer;
  IF v_recovered <> 1 THEN RAISE EXCEPTION 'expired reservation was not recovered'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.osm_search_requests
     WHERE user_id = v_user AND request_key = v_key AND state = 'failed'
       AND failure_code = 'reservation_expired_ambiguous' AND recovered_at IS NOT NULL
       AND recovery_reason = 'lease_expired_before_result_persistence'
  ) THEN RAISE EXCEPTION 'recovery audit fields were not recorded'; END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'state' <> 'failed' OR v_response->>'cached' <> 'true' THEN
    RAISE EXCEPTION 'ambiguous recovered request must never be retried upstream';
  END IF;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 3 THEN RAISE EXCEPTION 'recovery must retain the ambiguous call quota'; END IF;

  -- Repeated zero-result requests consume the shared 50-call limit across users.
  FOR i IN 4..50 LOOP
    v_key := ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
    PERFORM public.osm_concluir_pesquisa(v_user, v_key, '[]'::jsonb, now());
  END LOOP;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 50 THEN RAISE EXCEPTION 'repeated empty searches must consume all 50 global calls'; END IF;
  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_other, '20000000-0000-4000-8000-000000000001', 'Belém', 'PA', 'farmacia');
    RAISE EXCEPTION '51st call from another user should be rejected by shared cap';
  EXCEPTION WHEN SQLSTATE '54000' THEN NULL;
  END;
  SELECT calls_used INTO v_used FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 50 THEN RAISE EXCEPTION 'rejected global quota call changed the counter'; END IF;
END $$;
RESET ROLE;

