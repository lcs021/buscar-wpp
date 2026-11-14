DO $$
BEGIN
  IF has_function_privilege('anon', 'public.confirmar_presenca_digital(uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not confirm website evidence';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.confirmar_presenca_digital(uuid, boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must be able to confirm their website evidence';
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
INSERT INTO public.perfis (user_id, nota_minima, avaliacoes_minimas)
VALUES ('00000000-0000-4000-8000-000000000001', 4.5, 20);
INSERT INTO public.leads (id, user_id, place_id, nome, telefone, site, status_site, nota, avaliacoes)
VALUES
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'fixture:lead-a', 'Empresa Fictícia A', '11900000000', 'https://synthetic.example', 'com_site', 4.8, 40),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'fixture:lead-b', 'Empresa Fictícia B', '', '', 'sem_site', 4.8, 40);

SELECT public.confirmar_presenca_digital('10000000-0000-4000-8000-000000000001', false);
SELECT public.confirmar_presenca_digital('10000000-0000-4000-8000-000000000002', true);

DO $$
DECLARE
  own_row public.leads%ROWTYPE;
  other_row public.leads%ROWTYPE;
BEGIN
  SELECT * INTO own_row FROM public.leads WHERE id = '10000000-0000-4000-8000-000000000001';
  IF own_row.site_evidence_status <> 'confirmed_no_site'
     OR own_row.site_evidence_source <> 'human_review'
     OR own_row.site_evidence_at IS NULL
     OR own_row.status_site <> 'sem_site'
     OR own_row.site <> ''
     OR NOT own_row.qualificado THEN
    RAISE EXCEPTION 'human no-site confirmation must be timestamped and requalified for the owner';
  END IF;

  SELECT * INTO other_row FROM public.leads WHERE id = '10000000-0000-4000-8000-000000000002';
  IF other_row.site_evidence_status <> 'unverified'
     OR other_row.site_evidence_at IS NOT NULL
     OR other_row.status_site <> 'sem_site' THEN
    RAISE EXCEPTION 'a user must not change evidence on another user''s lead';
  END IF;
END $$;
RESET ROLE;
