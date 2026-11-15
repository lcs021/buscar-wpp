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
  v_key uuid;
  v_response jsonb;
  v_payload jsonb;
  v_usage public.osm_search_daily_usage%rowtype;
  v_recovered integer;
  v_time timestamptz := now();
  i integer;
BEGIN
  -- Empty and failed upstream attempts retain both call and candidate reservations.
  v_key := '10000000-0000-4000-8000-000000000001';
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF (v_response->>'result_reserved_count')::integer <> 10 THEN RAISE EXCEPTION 'first query must reserve ten result slots'; END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'cached' <> 'true' THEN RAISE EXCEPTION 'same key must not reserve quota twice'; END IF;
  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Belém', 'PA', 'veterinaria');
    RAISE EXCEPTION 'reused idempotency key with different filters was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  PERFORM public.osm_concluir_pesquisa(v_user, v_key, '[]'::jsonb, v_time);
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.calls_used <> 1 OR v_usage.candidate_slots_used <> 10 THEN
    RAISE EXCEPTION 'empty success must not refund either daily reservation';
  END IF;

  v_key := '10000000-0000-4000-8000-000000000002';
  PERFORM public.osm_reservar_pesquisa(v_other, v_key, 'Recife', 'PE', 'veterinaria');
  v_response := public.osm_falhar_pesquisa(v_other, v_key, 'source_timeout');
  IF v_response->>'failure_code' <> 'source_timeout' THEN RAISE EXCEPTION 'source failure was not recorded'; END IF;
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.calls_used <> 2 OR v_usage.candidate_slots_used <> 20 THEN RAISE EXCEPTION 'source failure must not refund quota'; END IF;

  -- A failed finalization is recovered as ambiguous; its result slots remain charged and key cannot retry.
  v_key := '10000000-0000-4000-8000-000000000003';
  PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  BEGIN
    PERFORM public.osm_concluir_pesquisa(v_user, v_key, jsonb_build_array(jsonb_build_object('phone', 'synthetic')), v_time);
    RAISE EXCEPTION 'invalid finalization payload was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
  UPDATE public.osm_search_requests SET reservation_expires_at = now() - interval '1 second'
   WHERE user_id = v_user AND request_key = v_key;
  v_response := public.osm_recuperar_reservas_abandonadas(100);
  v_recovered := (v_response->>'recovered')::integer;
  IF v_recovered <> 1 THEN RAISE EXCEPTION 'expired reservation was not recovered'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.osm_search_requests WHERE user_id = v_user AND request_key = v_key AND state = 'failed'
      AND failure_code = 'reservation_expired_ambiguous' AND recovered_at IS NOT NULL
      AND recovery_reason = 'lease_expired_before_result_persistence'
  ) THEN RAISE EXCEPTION 'recovery audit fields missing'; END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'state' <> 'failed' OR v_response->>'cached' <> 'true' THEN RAISE EXCEPTION 'ambiguous key retried'; END IF;
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.calls_used <> 3 OR v_usage.candidate_slots_used <> 30 THEN RAISE EXCEPTION 'recovery refunded a reservation'; END IF;

  -- Reset only this disposable CI fixture to independently test the 50-result ceiling.
  DELETE FROM public.osm_search_requests;
  DELETE FROM public.osm_search_daily_usage;

  -- Four full requests store 40 candidates. A 9-result response releases one slot;
  -- the next request may reserve only one slot, never ten.
  FOR i IN 1..4 LOOP
    v_key := ('30000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
    SELECT jsonb_agg(jsonb_build_object(
      'source', 'OpenStreetMap', 'source_element_id', 'node/' || ((i * 100) + n),
      'source_url', 'https://www.openstreetmap.org/node/' || ((i * 100) + n),
      'name', 'Synthetic business ' || n, 'category', 'veterinaria', 'city', 'Recife', 'uf', 'PE', 'website', NULL,
      'observed_at', v_time, 'license', 'ODbL-1.0', 'attribution', '© OpenStreetMap contributors',
      'attribution_url', 'https://www.openstreetmap.org/copyright',
      'website_evidence', jsonb_build_object('status', 'not_located_in_sources_consulted', 'detail', 'Synthetic OSM fixture')
    )) INTO v_payload FROM generate_series(1, 10) n;
    PERFORM public.osm_concluir_pesquisa(v_user, v_key, v_payload, v_time);
  END LOOP;
  v_key := '30000000-0000-4000-8000-000000000005';
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF (v_response->>'result_reserved_count')::integer <> 10 THEN RAISE EXCEPTION 'expected ten remaining result slots'; END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'source', 'OpenStreetMap', 'source_element_id', 'node/' || (501 + n),
    'source_url', 'https://www.openstreetmap.org/node/' || (501 + n),
    'name', 'Synthetic business ' || n, 'category', 'veterinaria', 'city', 'Recife', 'uf', 'PE', 'website', NULL,
    'observed_at', v_time, 'license', 'ODbL-1.0', 'attribution', '© OpenStreetMap contributors',
    'attribution_url', 'https://www.openstreetmap.org/copyright',
    'website_evidence', jsonb_build_object('status', 'inconclusive', 'detail', 'Synthetic evidence')
  )) INTO v_payload FROM generate_series(1, 9) n;
  PERFORM public.osm_concluir_pesquisa(v_user, v_key, v_payload, v_time);
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.candidate_slots_used <> 49 THEN RAISE EXCEPTION 'successful non-empty completion should release unused slots'; END IF;

  v_key := '30000000-0000-4000-8000-000000000006';
  v_response := public.osm_reservar_pesquisa(v_other, v_key, 'Recife', 'PE', 'veterinaria');
  IF (v_response->>'result_reserved_count')::integer <> 1 THEN RAISE EXCEPTION 'last request must reserve only the one remaining result slot'; END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'source', 'OpenStreetMap', 'source_element_id', 'node/' || (601 + n),
    'source_url', 'https://www.openstreetmap.org/node/' || (601 + n),
    'name', 'Synthetic business ' || n, 'category', 'veterinaria', 'city', 'Recife', 'uf', 'PE', 'website', NULL,
    'observed_at', v_time, 'license', 'ODbL-1.0', 'attribution', '© OpenStreetMap contributors',
    'attribution_url', 'https://www.openstreetmap.org/copyright',
    'website_evidence', jsonb_build_object('status', 'inconclusive', 'detail', 'Synthetic evidence')
  )) INTO v_payload FROM generate_series(1, 2) n;
  BEGIN
    PERFORM public.osm_concluir_pesquisa(v_other, v_key, v_payload, v_time);
    RAISE EXCEPTION '51st candidate was accepted by finalization';
  EXCEPTION WHEN SQLSTATE '54000' THEN NULL;
  END;
  SELECT jsonb_agg(jsonb_build_object(
    'source', 'OpenStreetMap', 'source_element_id', 'node/701', 'source_url', 'https://www.openstreetmap.org/node/701',
    'name', 'Synthetic business 1', 'category', 'veterinaria', 'city', 'Recife', 'uf', 'PE', 'website', NULL,
    'observed_at', v_time, 'license', 'ODbL-1.0', 'attribution', '© OpenStreetMap contributors',
    'attribution_url', 'https://www.openstreetmap.org/copyright',
    'website_evidence', jsonb_build_object('status', 'inconclusive', 'detail', 'Synthetic evidence')
  )) INTO v_payload;
  PERFORM public.osm_concluir_pesquisa(v_other, v_key, v_payload, v_time);
  IF (SELECT sum(result_count) FROM public.osm_search_requests) <> 50 THEN RAISE EXCEPTION 'stored result count must be exactly 50'; END IF;
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.calls_used <> 6 OR v_usage.candidate_slots_used <> 50 THEN RAISE EXCEPTION 'global call/result ledgers do not match'; END IF;
  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_user, '30000000-0000-4000-8000-000000000007', 'Recife', 'PE', 'veterinaria');
    RAISE EXCEPTION 'call after candidate cap should not reach the source';
  EXCEPTION WHEN SQLSTATE '54000' THEN NULL;
  END;

  -- Separately prove the call ceiling with 50 one-result searches.
  DELETE FROM public.osm_search_requests;
  DELETE FROM public.osm_search_daily_usage;
  FOR i IN 1..50 LOOP
    v_key := ('40000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
    SELECT jsonb_agg(jsonb_build_object(
      'source', 'OpenStreetMap', 'source_element_id', 'node/' || (1000 + i),
      'source_url', 'https://www.openstreetmap.org/node/' || (1000 + i),
      'name', 'Synthetic business ' || i, 'category', 'veterinaria', 'city', 'Recife', 'uf', 'PE', 'website', NULL,
      'observed_at', v_time, 'license', 'ODbL-1.0', 'attribution', '© OpenStreetMap contributors',
      'attribution_url', 'https://www.openstreetmap.org/copyright',
      'website_evidence', jsonb_build_object('status', 'inconclusive', 'detail', 'Synthetic evidence')
    )) INTO v_payload;
    PERFORM public.osm_concluir_pesquisa(v_user, v_key, v_payload, v_time);
  END LOOP;
  SELECT * INTO v_usage FROM public.osm_search_daily_usage WHERE quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_usage.calls_used <> 50 OR v_usage.candidate_slots_used <> 50 THEN RAISE EXCEPTION '50-call scenario failed'; END IF;
  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_other, '50000000-0000-4000-8000-000000000001', 'Belém', 'PA', 'farmacia');
    RAISE EXCEPTION '51st daily source call should be rejected';
  EXCEPTION WHEN SQLSTATE '54000' THEN NULL;
  END;
END $$;
RESET ROLE;

