DO $$
BEGIN
  IF has_function_privilege('anon', 'public.importar_pesquisa_revisada(uuid,text,text,text,text,text,text,text,jsonb,timestamptz,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.importar_pesquisa_revisada(uuid,text,text,text,text,text,text,text,jsonb,timestamptz,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC must be callable only by authenticated users (and checks reviewer membership)';
  END IF;
  IF has_table_privilege('authenticated', 'public.research_reviewers', 'SELECT')
     OR has_table_privilege('authenticated', 'public.research_reviewers', 'INSERT') THEN
    RAISE EXCEPTION 'reviewer membership must not be readable or self-editable';
  END IF;
END $$;
INSERT INTO public.research_reviewers (user_id) VALUES ('00000000-0000-4000-8000-000000000001');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
DO $$
DECLARE first_id uuid; retry_id uuid; candidate public.leads%ROWTYPE;
BEGIN
  BEGIN
    UPDATE public.leads SET site_evidence_status = 'confirmed_no_site'
     WHERE id = '10000000-0000-4000-8000-000000000001';
    RAISE EXCEPTION 'direct evidence update unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  first_id := public.importar_pesquisa_revisada(
    '20000000-0000-4000-8000-000000000001','synthetic-clinic|belem|pa','synthetic:research-clinic-1',
    'Clínica Sintética','Veterinária','Belém','PA','url_not_reported',
    '[{"title":"Fonte de teste","url":"https://synthetic.example/listing"}]'::jsonb,'2026-11-14T15:00:00Z',NULL);
  retry_id := public.importar_pesquisa_revisada(
    '20000000-0000-4000-8000-000000000001','synthetic-clinic|belem|pa','synthetic:research-clinic-1',
    'Clínica Sintética','Veterinária','Belém','PA','url_not_reported',
    '[{"title":"Fonte de teste","url":"https://synthetic.example/listing"}]'::jsonb,'2026-11-14T15:00:00Z',NULL);
  IF first_id <> retry_id THEN RAISE EXCEPTION 'retry must return original lead'; END IF;
  IF (public.importar_pesquisa_revisada(
    '20000000-0000-4000-8000-000000000009','synthetic-clinic|belem|pa','synthetic:research-clinic-2',
    'Clínica Sintética','Veterinária','Belém','PA','url_not_reported',
    '[{"title":"Fonte de teste","url":"https://synthetic.example/listing"}]'::jsonb,'2026-11-14T15:00:00Z',NULL)) <> first_id THEN
    RAISE EXCEPTION 'same candidate under a new idempotency key must deduplicate';
  END IF;
  SELECT * INTO candidate FROM public.leads WHERE id = first_id;
  IF NOT FOUND OR candidate.qualificado OR candidate.research_website_classification <> 'url_not_reported'
     OR candidate.status_site <> 'inconclusivo' OR candidate.site_evidence_status <> 'url_not_reported'
     OR candidate.research_observed_at <> '2026-11-14T15:00:00Z'::timestamptz
     OR jsonb_array_length(candidate.research_sources) <> 1 THEN
    RAISE EXCEPTION 'source/time must be preserved without inferring no-site or qualification';
  END IF;
  IF (SELECT count(*) FROM public.research_imports WHERE user_id = auth.uid()
      AND candidate_key = 'synthetic-clinic|belem|pa') <> 1 THEN
    RAISE EXCEPTION 'duplicate candidate created an extra import';
  END IF;
  BEGIN
    PERFORM public.importar_pesquisa_revisada(
      '20000000-0000-4000-8000-000000000002','incomplete-candidate','synthetic:incomplete',
      '','', 'Belém','PA','url_not_reported','[]'::jsonb,now(),NULL);
    RAISE EXCEPTION 'incomplete input unexpectedly accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
  END;
END $$;
RESET ROLE;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
DO $$
BEGIN
  BEGIN
    PERFORM public.importar_pesquisa_revisada(
      '20000000-0000-4000-8000-000000000003','synthetic-other-owner','synthetic:other-owner',
      'Empresa Sintética','','Belém','PA','inconclusive',
      '[{"title":"Fonte de teste","url":"https://synthetic.example"}]'::jsonb,now(),NULL);
    RAISE EXCEPTION 'non-reviewer unexpectedly imported research';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.research_imports) THEN
    RAISE EXCEPTION 'RLS must hide another user imports';
  END IF;
END $$;
RESET ROLE;
