DO $$ BEGIN
  CREATE ROLE anon NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE authenticated NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid primary key);
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');

CREATE TABLE public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  place_id text not null default gen_random_uuid()::text,
  slug text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  demo_publicada boolean not null default false,
  visualizacoes integer not null default 0,
  ultima_visualizacao timestamptz,
  nome text not null default '',
  categoria text not null default '',
  nicho text not null default 'generico',
  telefone text not null default '',
  celular boolean not null default false,
  whatsapp text not null default '',
  endereco text not null default '',
  bairro text not null default '',
  cidade text not null default '',
  uf text not null default '',
  maps_url text not null default '',
  instagram text not null default '',
  facebook text not null default '',
  nota numeric(2,1),
  avaliacoes integer,
  site text NOT NULL DEFAULT '',
  status_site text NOT NULL DEFAULT 'sem_site',
  qualificado boolean NOT NULL DEFAULT false,
  motivo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'novo',
  favorito boolean NOT NULL DEFAULT false,
  observacoes text NOT NULL DEFAULT '',
  mensagem text,
  enviado_em timestamptz
);

CREATE TABLE public.perfis (
  user_id uuid PRIMARY KEY,
  nota_minima numeric(2,1) NOT NULL DEFAULT 4.5,
  avaliacoes_minimas integer NOT NULL DEFAULT 20
);

GRANT SELECT, INSERT, UPDATE ON public.leads, public.perfis TO authenticated;
