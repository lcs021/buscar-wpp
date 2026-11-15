-- Shared global daily request quota until the application has organizations/membership.
CREATE TABLE IF NOT EXISTS public.osm_search_daily_usage (
  quota_day date NOT NULL,
  calls_used smallint NOT NULL DEFAULT 0 CHECK (calls_used BETWEEN 0 AND 50),
  PRIMARY KEY (quota_day)
);

CREATE TABLE IF NOT EXISTS public.osm_search_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key uuid NOT NULL,
  quota_day date NOT NULL,
  query jsonb NOT NULL CHECK (jsonb_typeof(query) = 'object'),
  state text NOT NULL CHECK (state IN ('reserved', 'completed', 'failed')),
  charged_count smallint NOT NULL DEFAULT 10 CHECK (charged_count BETWEEN 0 AND 10),
  result_count smallint NOT NULL DEFAULT 0 CHECK (result_count BETWEEN 0 AND 10),
  results jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(results) = 'array'),
  observed_at timestamptz,
  failure_code text CHECK (failure_code IS NULL OR failure_code IN
    ('source_unavailable', 'source_timeout', 'invalid_source_response', 'reservation_expired_ambiguous')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reservation_expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  recovered_at timestamptz,
  recovery_reason text,
  completed_at timestamptz,
  PRIMARY KEY (user_id, request_key)
);

CREATE INDEX IF NOT EXISTS osm_search_requests_expired_idx
  ON public.osm_search_requests (reservation_expires_at) WHERE state = 'reserved';

ALTER TABLE public.osm_search_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osm_search_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.osm_search_daily_usage, public.osm_search_requests FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.osm_search_daily_usage, public.osm_search_requests TO service_role;

CREATE OR REPLACE FUNCTION public.osm_recuperar_reservas_abandonadas(p_limit integer DEFAULT 100)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_recovered integer;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'invalid recovery batch size' USING ERRCODE = '22023';
  END IF;
  WITH stale AS (
    SELECT r.user_id, r.request_key
      FROM public.osm_search_requests r
     WHERE r.state = 'reserved' AND r.reservation_expires_at <= now()
     ORDER BY r.reservation_expires_at
     LIMIT p_limit
     FOR UPDATE SKIP LOCKED
  )
  UPDATE public.osm_search_requests r
     SET state = 'failed', failure_code = 'reservation_expired_ambiguous',
         recovered_at = now(), recovery_reason = 'lease_expired_before_result_persistence', completed_at = now()
    FROM stale s
   WHERE r.user_id = s.user_id AND r.request_key = s.request_key;
  GET DIAGNOSTICS v_recovered = ROW_COUNT;
  -- Do not release quota: source execution may have succeeded before persistence failed.
  RETURN jsonb_build_object('recovered', v_recovered);
END;
$$;

CREATE OR REPLACE FUNCTION public.osm_reservar_pesquisa(
  p_user_id uuid, p_request_key uuid, p_city text, p_uf text, p_segment text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_day date := (now() AT TIME ZONE 'UTC')::date;
  v_query jsonb;
  v_used smallint;
  v_existing public.osm_search_requests%rowtype;
BEGIN
  IF p_user_id IS NULL OR p_request_key IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.research_reviewers r WHERE r.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'reviewer authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_city IS NULL OR length(btrim(p_city)) NOT BETWEEN 2 AND 100
     OR p_city ~ '[[:cntrl:]]'
     OR p_uf IS NULL OR upper(btrim(p_uf)) !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
     OR p_segment IS NULL OR p_segment NOT IN ('veterinaria','restaurante','farmacia','barbearia','padaria','hotel','oficina') THEN
    RAISE EXCEPTION 'invalid search filters' USING ERRCODE = '22023';
  END IF;
  v_query := jsonb_build_object('city', btrim(p_city), 'uf', upper(btrim(p_uf)), 'segment', p_segment);

  PERFORM public.osm_recuperar_reservas_abandonadas(100);

  INSERT INTO public.osm_search_daily_usage (quota_day)
  VALUES (v_day) ON CONFLICT DO NOTHING;
  SELECT u.calls_used INTO v_used FROM public.osm_search_daily_usage u
   WHERE u.quota_day = v_day FOR UPDATE;

  SELECT * INTO v_existing FROM public.osm_search_requests r
   WHERE r.user_id = p_user_id AND r.request_key = p_request_key FOR UPDATE;
  IF FOUND THEN
    IF v_existing.query <> v_query THEN
      RAISE EXCEPTION 'idempotency key reused with different filters' USING ERRCODE = '22023';
    END IF;
    RETURN jsonb_build_object(
      'state', v_existing.state, 'cached', true, 'results', v_existing.results,
      'failure_code', v_existing.failure_code, 'observed_at', v_existing.observed_at
    );
  END IF;

  IF v_used + 1 > 50 THEN
    RAISE EXCEPTION 'daily OSM research limit reached' USING ERRCODE = '54000';
  END IF;
  UPDATE public.osm_search_daily_usage SET calls_used = calls_used + 1
   WHERE quota_day = v_day;
  INSERT INTO public.osm_search_requests
    (user_id, request_key, quota_day, query, state, charged_count, reservation_expires_at)
  VALUES (p_user_id, p_request_key, v_day, v_query, 'reserved', 10, now() + interval '2 minutes');
  RETURN jsonb_build_object('state', 'reserved', 'cached', false, 'reserved_count', 10, 'daily_calls_used', v_used + 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.osm_concluir_pesquisa(
  p_user_id uuid, p_request_key uuid, p_results jsonb, p_observed_at timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_request public.osm_search_requests%rowtype;
  v_count smallint;
  v_result jsonb;
  v_evidence jsonb;
BEGIN
  IF p_user_id IS NULL OR p_request_key IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.research_reviewers r WHERE r.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'reviewer authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_results IS NULL OR jsonb_typeof(p_results) <> 'array'
     OR jsonb_array_length(p_results) > 10 OR p_observed_at IS NULL THEN
    RAISE EXCEPTION 'invalid OSM result payload' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_request FROM public.osm_search_requests r
   WHERE r.user_id = p_user_id AND r.request_key = p_request_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'search reservation not found' USING ERRCODE = 'P0002'; END IF;
  IF v_request.state = 'completed' THEN
    RETURN jsonb_build_object('state', 'completed', 'cached', true, 'results', v_request.results,
      'observed_at', v_request.observed_at);
  END IF;
  IF v_request.state <> 'reserved' THEN RAISE EXCEPTION 'search reservation is not active' USING ERRCODE = '22023'; END IF;

  FOR v_result IN SELECT value FROM jsonb_array_elements(p_results) AS item(value)
  LOOP
    IF jsonb_typeof(v_result) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_result) AS k(key)
         WHERE k.key NOT IN ('source','source_element_id','source_url','name','category','city','uf','website',
           'website_evidence','observed_at','license','attribution','attribution_url'))
       OR v_result->>'source' <> 'OpenStreetMap'
       OR v_result->>'license' <> 'ODbL-1.0'
       OR v_result->>'attribution' <> '© OpenStreetMap contributors'
       OR v_result->>'attribution_url' <> 'https://www.openstreetmap.org/copyright'
       OR coalesce(v_result->>'source_element_id','') !~ '^(node|way|relation)/[1-9][0-9]*$'
       OR coalesce(v_result->>'source_url','') !~ '^https://www\.openstreetmap\.org/(node|way|relation)/[1-9][0-9]*$'
       OR length(coalesce(v_result->>'name','')) NOT BETWEEN 1 AND 200
       OR length(coalesce(v_result->>'category','')) > 80
       OR v_result->>'city' <> v_request.query->>'city'
       OR v_result->>'uf' <> v_request.query->>'uf'
       OR (v_result->>'observed_at')::timestamptz <> p_observed_at THEN
      RAISE EXCEPTION 'OSM result provenance or minimized field set is invalid' USING ERRCODE = '22023';
    END IF;
    v_evidence := v_result->'website_evidence';
    IF jsonb_typeof(v_evidence) <> 'object'
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_evidence) AS k(key) WHERE k.key NOT IN ('status','detail'))
       OR v_evidence->>'status' NOT IN ('found_in_osm','not_located_in_sources_consulted','inconclusive')
       OR length(coalesce(v_evidence->>'detail','')) = 0 THEN
      RAISE EXCEPTION 'OSM website evidence is invalid' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  v_count := jsonb_array_length(p_results)::smallint;
  UPDATE public.osm_search_requests SET state = 'completed', result_count = v_count,
    charged_count = v_count, results = p_results, observed_at = p_observed_at,
    completed_at = now(), failure_code = NULL
   WHERE user_id = p_user_id AND request_key = p_request_key;
  RETURN jsonb_build_object('state', 'completed', 'cached', false, 'results', p_results,
    'observed_at', p_observed_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.osm_falhar_pesquisa(
  p_user_id uuid, p_request_key uuid, p_failure_code text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_request public.osm_search_requests%rowtype;
BEGIN
  IF p_user_id IS NULL OR p_request_key IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.research_reviewers r WHERE r.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'reviewer authorization required' USING ERRCODE = '42501';
  END IF;
  IF p_failure_code IS NULL OR p_failure_code NOT IN ('source_unavailable','source_timeout','invalid_source_response') THEN
    RAISE EXCEPTION 'invalid source failure code' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_request FROM public.osm_search_requests r
   WHERE r.user_id = p_user_id AND r.request_key = p_request_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'search reservation not found' USING ERRCODE = 'P0002'; END IF;
  IF v_request.state = 'completed' THEN
    RETURN jsonb_build_object('state', 'completed', 'cached', true, 'results', v_request.results,
      'observed_at', v_request.observed_at);
  END IF;
  IF v_request.state = 'failed' THEN
    RETURN jsonb_build_object('state', 'failed', 'cached', true, 'failure_code', v_request.failure_code);
  END IF;
  -- Keep the whole 10-result reservation on errors so repeated failures cannot exceed the cap.
  UPDATE public.osm_search_requests SET state = 'failed', failure_code = p_failure_code,
    completed_at = now() WHERE user_id = p_user_id AND request_key = p_request_key;
  RETURN jsonb_build_object('state', 'failed', 'cached', false, 'failure_code', p_failure_code);
END;
$$;

REVOKE ALL ON FUNCTION public.osm_reservar_pesquisa(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.osm_recuperar_reservas_abandonadas(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.osm_concluir_pesquisa(uuid,uuid,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.osm_falhar_pesquisa(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.osm_reservar_pesquisa(uuid,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.osm_recuperar_reservas_abandonadas(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.osm_concluir_pesquisa(uuid,uuid,jsonb,timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.osm_falhar_pesquisa(uuid,uuid,text) TO service_role;

