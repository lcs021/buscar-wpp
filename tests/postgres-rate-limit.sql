DO $$
BEGIN
  IF has_function_privilege('anon', 'public.limitar_busca()', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not be able to call limitar_busca';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.limitar_busca()', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must be able to call limitar_busca';
  END IF;
END $$;

DO $$
DECLARE
  novo_slug text;
BEGIN
  INSERT INTO public.leads DEFAULT VALUES RETURNING slug INTO novo_slug;
  IF length(novo_slug) < 16 THEN
    RAISE EXCEPTION 'new public slugs should have at least 64 bits';
  END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);

DO $$
DECLARE
  chamada integer;
BEGIN
  FOR chamada IN 1..5 LOOP
    IF public.limitar_busca() IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'request % should be allowed', chamada;
    END IF;
  END LOOP;

  IF public.limitar_busca() IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'sixth request in the same minute should be blocked';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
  IF public.limitar_busca() IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'a different user should have an independent limit';
  END IF;
END $$;

RESET ROLE;
