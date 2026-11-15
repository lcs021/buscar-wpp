DO $$
BEGIN
  IF has_function_privilege('authenticated', 'public.osm_reservar_pesquisa(uuid,uuid,text,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.osm_concluir_pesquisa(uuid,uuid,jsonb,timestamptz)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.osm_falhar_pesquisa(uuid,uuid,text)', 'EXECUTE') THEN
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
  v_results jsonb;
  v_full jsonb;
  v_used integer;
  i integer;
BEGIN
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'state' <> 'reserved' OR v_response->>'cached' <> 'false' THEN
    RAISE EXCEPTION 'first query must reserve quota';
  END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'cached' <> 'true' OR v_response->>'state' <> 'reserved' THEN
    RAISE EXCEPTION 'same idempotency key must not create another reservation';
  END IF;
  SELECT used_count INTO v_used FROM public.osm_search_daily_usage
   WHERE user_id = v_user AND quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 10 THEN RAISE EXCEPTION 'duplicate query must not consume extra quota'; END IF;

  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Belém', 'PA', 'veterinaria');
    RAISE EXCEPTION 'reused idempotency key with different filters was accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;

  SELECT jsonb_agg(jsonb_build_object(
    'source', 'OpenStreetMap', 'source_element_id', 'node/' || n,
    'source_url', 'https://www.openstreetmap.org/node/' || n,
    'name', 'Empresa sintética ' || n, 'category', 'veterinaria',
    'city', 'Recife', 'uf', 'PE', 'website', NULL,
    'observed_at', '2026-11-15T12:00:00Z', 'license', 'ODbL-1.0',
    'attribution', '© OpenStreetMap contributors',
    'attribution_url', 'https://www.openstreetmap.org/copyright',
    'website_evidence', jsonb_build_object(
      'status', CASE WHEN n = 1 THEN 'not_located_in_sources_consulted' ELSE 'found_in_osm' END,
      'detail', 'Tag website sintética consultada no OpenStreetMap'
    )
  )) INTO v_results FROM generate_series(1, 2) n;
  v_response := public.osm_concluir_pesquisa(v_user, v_key, v_results, '2026-11-15T12:00:00Z');
  IF v_response->>'state' <> 'completed' OR jsonb_array_length(v_response->'results') <> 2 THEN
    RAISE EXCEPTION 'completed OSM evidence was not preserved';
  END IF;
  v_response := public.osm_concluir_pesquisa(v_user, v_key, v_results, '2026-11-15T12:00:00Z');
  IF v_response->>'cached' <> 'true' THEN RAISE EXCEPTION 'completion retry must be idempotent'; END IF;
  SELECT used_count INTO v_used FROM public.osm_search_daily_usage
   WHERE user_id = v_user AND quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 2 THEN RAISE EXCEPTION 'successful query must release unused reservation'; END IF;

  v_key := '10000000-0000-4000-8000-000000000002';
  PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  v_response := public.osm_falhar_pesquisa(v_user, v_key, 'source_timeout');
  IF v_response->>'state' <> 'failed' OR v_response->>'failure_code' <> 'source_timeout' THEN
    RAISE EXCEPTION 'source failure code was not recorded';
  END IF;
  v_response := public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
  IF v_response->>'cached' <> 'true' OR v_response->>'state' <> 'failed' THEN
    RAISE EXCEPTION 'failed idempotent request must not call source again';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'source', 'OpenStreetMap', 'source_element_id', 'node/' || n,
    'source_url', 'https://www.openstreetmap.org/node/' || n,
    'name', 'Empresa sintética ' || n, 'category', 'veterinaria',
    'city', 'Recife', 'uf', 'PE', 'website', NULL,
    'observed_at', now(), 'license', 'ODbL-1.0',
    'attribution', '© OpenStreetMap contributors',
    'attribution_url', 'https://www.openstreetmap.org/copyright',
    'website_evidence', jsonb_build_object('status', 'inconclusive', 'detail', 'Busca sintética inconclusiva')
  )) INTO v_full FROM generate_series(1, 10) n;
  FOR i IN 3..5 LOOP
    v_key := ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    PERFORM public.osm_reservar_pesquisa(v_user, v_key, 'Recife', 'PE', 'veterinaria');
    v_response := public.osm_concluir_pesquisa(v_user, v_key, v_full, now());
    IF v_response->>'state' <> 'completed' THEN RAISE EXCEPTION 'synthetic results were not completed'; END IF;
  END LOOP;
  SELECT used_count INTO v_used FROM public.osm_search_daily_usage
   WHERE user_id = v_user AND quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 42 THEN RAISE EXCEPTION 'failed requests must retain their conservative reservation'; END IF;

  BEGIN
    PERFORM public.osm_reservar_pesquisa(v_user, '10000000-0000-4000-8000-000000000006', 'Recife', 'PE', 'veterinaria');
    RAISE EXCEPTION 'daily cap should reject the sixth 10-result reservation';
  EXCEPTION WHEN SQLSTATE '54000' THEN NULL;
  END;
  SELECT used_count INTO v_used FROM public.osm_search_daily_usage
   WHERE user_id = v_user AND quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 42 THEN RAISE EXCEPTION 'rejected request must not change quota'; END IF;

  PERFORM public.osm_reservar_pesquisa(v_other,
    '20000000-0000-4000-8000-000000000001', 'Belém', 'PA', 'farmacia');
  SELECT used_count INTO v_used FROM public.osm_search_daily_usage
   WHERE user_id = v_other AND quota_day = (now() AT TIME ZONE 'UTC')::date;
  IF v_used <> 10 THEN RAISE EXCEPTION 'daily cap should be isolated by tenant'; END IF;
END $$;
RESET ROLE;

