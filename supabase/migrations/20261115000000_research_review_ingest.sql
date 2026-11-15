-- Reviewed imports enter the user's Lead Finder, but are never qualified automatically.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS research_observed_at timestamptz,
  ADD COLUMN IF NOT EXISTS research_website_classification text NOT NULL DEFAULT 'unverified'
    CHECK (research_website_classification IN ('own_site','instagram','facebook','social_only','listing_only','url_not_reported','inconclusive','confirmed_no_site','unverified'));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_site_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_status_site_check
  CHECK (status_site IN ('sem_site','instagram','facebook','whatsapp','link_agregador','com_site','presenca_social','presenca_listagem','inconclusivo'));

-- PR #5 allowed direct edits to these fields. Keep ordinary UI edits and route evidence through RPCs.
REVOKE UPDATE ON public.leads FROM authenticated;
GRANT UPDATE (status, favorito, observacoes, mensagem, demo_publicada, enviado_em)
  ON public.leads TO authenticated;

CREATE OR REPLACE FUNCTION public.confirmar_presenca_digital(p_lead_id uuid, p_tem_site boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_tem_site IS NULL THEN
    RAISE EXCEPTION 'Confirmação de presença digital inválida.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.leads AS l
     SET site_evidence_status = CASE WHEN p_tem_site THEN 'confirmed_site' ELSE 'confirmed_no_site' END,
         site_evidence_source = 'human_review', site_evidence_at = now(),
         research_website_classification = CASE WHEN p_tem_site THEN 'own_site' ELSE 'confirmed_no_site' END,
         status_site = CASE WHEN p_tem_site THEN 'com_site' ELSE 'sem_site' END,
         site = CASE WHEN p_tem_site THEN l.site ELSE '' END,
         qualificado = CASE WHEN p_tem_site THEN false ELSE
           coalesce(l.nota >= coalesce((SELECT p.nota_minima FROM public.perfis p WHERE p.user_id = l.user_id), 4.5), false)
           AND coalesce(l.avaliacoes >= coalesce((SELECT p.avaliacoes_minimas FROM public.perfis p WHERE p.user_id = l.user_id), 20), false)
           AND (l.telefone <> '' OR l.whatsapp <> '') END,
         motivo = CASE WHEN p_tem_site THEN 'Fora do filtro: site próprio confirmado por revisão humana.'
           ELSE 'Presença digital revisada por uma pessoa; ausência de site próprio confirmada.' END
   WHERE l.id = p_lead_id AND l.user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.confirmar_presenca_digital(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_presenca_digital(uuid, boolean) TO authenticated;

-- Only the project owner/service role can provision reviewers. Users cannot enroll themselves.
CREATE TABLE IF NOT EXISTS public.research_reviewers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.research_reviewers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.research_reviewers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.research_reviewers TO service_role;

CREATE TABLE IF NOT EXISTS public.research_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  candidate_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  UNIQUE (user_id, candidate_key)
);
ALTER TABLE public.research_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY research_imports_owner_read ON public.research_imports
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
REVOKE ALL ON public.research_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.research_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.research_imports TO service_role;

CREATE OR REPLACE FUNCTION public.importar_pesquisa_revisada(
  p_idempotency_key uuid, p_candidate_key text, p_place_id text, p_nome text,
  p_categoria text, p_cidade text, p_uf text, p_website_classification text,
  p_sources jsonb, p_observed_at timestamptz, p_website_url text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_key text := lower(btrim(coalesce(p_candidate_key, '')));
  v_existing uuid;
  v_lead_id uuid;
  v_source jsonb;
  v_status_site text;
  v_evidence_status text;
BEGIN
  IF v_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.research_reviewers r WHERE r.user_id = v_user_id) THEN
    RAISE EXCEPTION 'A conta não está autorizada a importar pesquisas revisadas.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(v_key) < 3 OR length(v_key) > 240
     OR nullif(btrim(p_place_id), '') IS NULL OR length(p_place_id) > 300
     OR nullif(btrim(p_nome), '') IS NULL OR length(p_nome) > 200
     OR nullif(btrim(p_cidade), '') IS NULL OR length(p_cidade) > 120
     OR p_uf IS NULL OR upper(btrim(p_uf)) !~ '^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$'
     OR p_website_classification IS NULL OR p_website_classification NOT IN ('own_site','instagram','facebook','social_only','listing_only','url_not_reported','inconclusive','confirmed_no_site','unverified')
     OR p_observed_at IS NULL OR p_sources IS NULL OR jsonb_typeof(p_sources) <> 'array' OR jsonb_array_length(p_sources) = 0 THEN
    RAISE EXCEPTION 'Pesquisa incompleta ou classificação inválida.' USING ERRCODE = '22023';
  END IF;
  IF p_website_classification = 'own_site' AND (p_website_url IS NULL OR p_website_url !~* '^https?://[^[:space:]]+$') THEN
    RAISE EXCEPTION 'Classificação own_site exige URL verificável.' USING ERRCODE = '22023';
  END IF;
  FOR v_source IN SELECT value FROM jsonb_array_elements(p_sources)
  LOOP
    IF jsonb_typeof(v_source) <> 'object'
       OR coalesce(v_source->>'url', '') !~* '^https?://[^[:space:]]+$'
       OR length(coalesce(v_source->>'title', '')) = 0 THEN
      RAISE EXCEPTION 'Cada fonte precisa de título e URL HTTP(S).' USING ERRCODE = '22023';
    END IF;
  END LOOP;

  SELECT i.lead_id INTO v_existing FROM public.research_imports i
   WHERE i.user_id = v_user_id AND (i.idempotency_key = p_idempotency_key OR i.candidate_key = v_key) LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_status_site := CASE p_website_classification
    WHEN 'own_site' THEN 'com_site' WHEN 'instagram' THEN 'instagram' WHEN 'facebook' THEN 'facebook'
    WHEN 'social_only' THEN 'presenca_social' WHEN 'listing_only' THEN 'presenca_listagem'
    WHEN 'confirmed_no_site' THEN 'sem_site' ELSE 'inconclusivo' END;
  v_evidence_status := CASE p_website_classification
    WHEN 'own_site' THEN 'url_reported' WHEN 'confirmed_no_site' THEN 'confirmed_no_site'
    WHEN 'url_not_reported' THEN 'url_not_reported' ELSE 'unverified' END;

  INSERT INTO public.leads (
    user_id, place_id, nome, categoria, cidade, uf, site, status_site,
    site_evidence_status, site_evidence_source, site_evidence_at,
    research_sources, research_observed_at, research_website_classification, qualificado, motivo
  ) VALUES (
    v_user_id, btrim(p_place_id), btrim(p_nome), coalesce(p_categoria, ''),
    btrim(p_cidade), upper(btrim(p_uf)), coalesce(p_website_url, ''), v_status_site,
    v_evidence_status, 'human_review', p_observed_at, p_sources, p_observed_at,
    p_website_classification, false, 'Evidência de pesquisa revisada importada; qualificação pendente.'
  )
  ON CONFLICT (user_id, place_id) DO UPDATE SET
    nome = EXCLUDED.nome, categoria = EXCLUDED.categoria, cidade = EXCLUDED.cidade, uf = EXCLUDED.uf,
    site = CASE WHEN EXCLUDED.site <> '' THEN EXCLUDED.site ELSE public.leads.site END,
    status_site = EXCLUDED.status_site, site_evidence_status = EXCLUDED.site_evidence_status,
    site_evidence_source = EXCLUDED.site_evidence_source, site_evidence_at = EXCLUDED.site_evidence_at,
    research_sources = EXCLUDED.research_sources, research_observed_at = EXCLUDED.research_observed_at,
    research_website_classification = EXCLUDED.research_website_classification,
    qualificado = false, motivo = EXCLUDED.motivo
  RETURNING id INTO v_lead_id;

  INSERT INTO public.research_imports (user_id, lead_id, idempotency_key, candidate_key)
  VALUES (v_user_id, v_lead_id, p_idempotency_key, v_key);
  RETURN v_lead_id;
END;
$$;
REVOKE ALL ON FUNCTION public.importar_pesquisa_revisada(uuid,text,text,text,text,text,text,text,jsonb,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.importar_pesquisa_revisada(uuid,text,text,text,text,text,text,text,jsonb,timestamptz,text) TO authenticated;
