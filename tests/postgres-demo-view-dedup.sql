DO $$
BEGIN
  IF has_table_privilege('anon', 'public.demo_view_counts', 'SELECT') THEN
    RAISE EXCEPTION 'anon must not read view deduplication records';
  END IF;
  IF has_table_privilege('anon', 'public.demo_view_counts', 'INSERT') THEN
    RAISE EXCEPTION 'anon must not write view deduplication records';
  END IF;
  IF NOT has_function_privilege('anon', 'public.demo_publica(text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'public demo RPC must remain callable by anon';
  END IF;
END $$;

INSERT INTO public.leads (slug, demo_publicada, nome)
VALUES ('demo-view-test-0001', true, 'Demo teste'),
       ('demo-view-test-0002', true, 'Outra demo teste');

-- The compatibility flag is client-controlled and must not affect counting.
SET ROLE anon;
SELECT public.demo_publica('demo-view-test-0001', false);
SELECT public.demo_publica('demo-view-test-0001', true);
SELECT public.demo_publica('demo-view-test-0001', true);
SELECT public.demo_publica('demo-view-test-0002', false);
RESET ROLE;

DO $$
BEGIN
  IF (SELECT visualizacoes FROM public.leads WHERE slug = 'demo-view-test-0001') <> 1 THEN
    RAISE EXCEPTION 'repeated calls must count a demo at most once per UTC day';
  END IF;
  IF (SELECT visualizacoes FROM public.leads WHERE slug = 'demo-view-test-0002') <> 1 THEN
    RAISE EXCEPTION 'deduplication must be scoped to each demo';
  END IF;
  IF (SELECT count(*) FROM public.demo_view_counts) <> 2 THEN
    RAISE EXCEPTION 'store only one aggregate deduplication key per demo and day';
  END IF;
END $$;
