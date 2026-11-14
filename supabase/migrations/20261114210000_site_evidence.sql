-- Record the source and time behind each presence-of-site classification.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS site_evidence_status text NOT NULL DEFAULT 'unverified'
    CHECK (site_evidence_status IN ('url_not_reported','url_reported','confirmed_no_site','confirmed_site','unverified')),
  ADD COLUMN IF NOT EXISTS site_evidence_source text NOT NULL DEFAULT 'legacy'
    CHECK (site_evidence_source IN ('google_places','manual','csv','human_review','legacy')),
  ADD COLUMN IF NOT EXISTS site_evidence_at timestamptz;

COMMENT ON COLUMN public.leads.site_evidence_status IS
  'Evidence state, not a general claim that a business has or lacks a website.';
COMMENT ON COLUMN public.leads.site_evidence_source IS
  'Source of the latest site-presence evidence: Places result, manual/CSV input, human review, or legacy row.';
COMMENT ON COLUMN public.leads.site_evidence_at IS
  'Server observation time for Places evidence or server-confirmed time for human review; null means not verified.';

-- Existing rows have no recorded source/time, so they cannot remain eligible based on the old inference.
UPDATE public.leads
   SET qualificado = false,
       motivo = CASE WHEN qualificado
         THEN 'Fora do filtro: registro anterior sem evidência de site verificável.'
         ELSE motivo END
 WHERE site_evidence_source = 'legacy';

-- The user explicitly confirms after checking; the database supplies the timestamp.
CREATE OR REPLACE FUNCTION public.confirmar_presenca_digital(p_lead_id uuid, p_tem_site boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_tem_site IS NULL THEN
    RAISE EXCEPTION 'Confirmação de presença digital inválida.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.leads AS l
     SET site_evidence_status = CASE WHEN p_tem_site THEN 'confirmed_site' ELSE 'confirmed_no_site' END,
         site_evidence_source = 'human_review',
         site_evidence_at = now(),
         status_site = CASE WHEN p_tem_site THEN 'com_site' ELSE 'sem_site' END,
         site = CASE WHEN p_tem_site THEN l.site ELSE '' END,
         qualificado = CASE WHEN p_tem_site THEN false ELSE
           coalesce(l.nota >= coalesce((SELECT p.nota_minima FROM public.perfis AS p WHERE p.user_id = l.user_id), 4.5), false)
           AND coalesce(l.avaliacoes >= coalesce((SELECT p.avaliacoes_minimas FROM public.perfis AS p WHERE p.user_id = l.user_id), 20), false)
           AND (l.telefone <> '' OR l.whatsapp <> '') END,
         motivo = CASE WHEN p_tem_site THEN 'Fora do filtro: site próprio confirmado por revisão humana.'
           ELSE 'Presença digital revisada por uma pessoa; ausência de site próprio confirmada.' END
   WHERE l.id = p_lead_id AND l.user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_presenca_digital(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_presenca_digital(uuid, boolean) TO authenticated;
