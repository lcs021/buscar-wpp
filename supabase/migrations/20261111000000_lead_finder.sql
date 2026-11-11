-- =====================================================================
-- Lead Finder Cloud — banco de dados
-- Rode este arquivo inteiro no Supabase: Dashboard > SQL Editor > New query > Run
-- =====================================================================

-- ---------------------------------------------------------------- perfil do vendedor
create table if not exists public.perfis (
  user_id            uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  nome_vendedor      text not null default '',
  cidade_padrao      text not null default '',
  uf_padrao          text not null default '',
  nota_minima        numeric(2,1) not null default 4.5 check (nota_minima between 0 and 5),
  avaliacoes_minimas integer not null default 20 check (avaliacoes_minimas >= 0),
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- histórico de buscas
create table if not exists public.buscas (
  id           bigint generated always as identity primary key,
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  termo        text not null,
  resultados   integer not null default 0,
  novos        integer not null default 0,
  qualificados integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists buscas_user_created_idx on public.buscas (user_id, created_at desc);

-- ---------------------------------------------------------------- leads (empresas)
create table if not exists public.leads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  place_id            text not null,
  -- identificador curto e difícil de adivinhar usado no link público do site demo
  slug                text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),

  -- dados públicos vindos do Google Places
  nome                text not null,
  categoria           text not null default '',
  nicho               text not null default 'generico',
  telefone            text not null default '',
  celular             boolean not null default false,
  whatsapp            text not null default '',
  endereco            text not null default '',
  bairro              text not null default '',
  cidade              text not null default '',
  uf                  text not null default '',
  maps_url            text not null default '',
  site                text not null default '',
  instagram           text not null default '',
  facebook            text not null default '',
  status_site         text not null default 'sem_site'
                      check (status_site in ('sem_site','instagram','facebook','whatsapp','link_agregador','com_site')),
  nota                numeric(2,1),
  avaliacoes          integer,
  qualificado         boolean not null default false,
  motivo              text not null default '',
  busca_termo         text not null default '',

  -- prospecção
  status              text not null default 'novo'
                      check (status in ('novo','enviado','respondeu','interessado','fechado','perdido','descartado')),
  favorito            boolean not null default false,
  observacoes         text not null default '',
  mensagem            text,                       -- mensagem editada à mão (null = usar a automática)
  demo_publicada      boolean not null default false,
  visualizacoes       integer not null default 0,
  ultima_visualizacao timestamptz,
  enviado_em          timestamptz,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, place_id)
);
create index if not exists leads_user_status_idx  on public.leads (user_id, status);
create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);

-- ---------------------------------------------------------------- updated_at automático
create or replace function public.tocar_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists leads_updated_at on public.leads;
create trigger leads_updated_at before update on public.leads
  for each row execute function public.tocar_updated_at();
drop trigger if exists perfis_updated_at on public.perfis;
create trigger perfis_updated_at before update on public.perfis
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------- segurança (RLS): cada usuário só vê o que é dele
alter table public.perfis enable row level security;
alter table public.buscas enable row level security;
alter table public.leads  enable row level security;

drop policy if exists "perfis do dono" on public.perfis;
create policy "perfis do dono" on public.perfis for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "buscas do dono" on public.buscas;
create policy "buscas do dono" on public.buscas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "leads do dono" on public.leads;
create policy "leads do dono" on public.leads for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Tabelas novas não são mais expostas automaticamente na API: liberamos só para usuários logados.
revoke all on public.perfis, public.buscas, public.leads from anon;
grant select, insert, update, delete on public.perfis, public.buscas, public.leads to authenticated;

-- ---------------------------------------------------------------- página pública do site demo
-- Quem recebe o link (sem login) só consegue ler UMA demo, pelo slug exato, e só se ela estiver
-- publicada. Por isso a função é SECURITY DEFINER: ela devolve apenas os campos públicos abaixo,
-- nunca lista as outras empresas nem mostra observações, status ou mensagens.
create or replace function public.demo_publica(p_slug text, p_contar boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.leads%rowtype;
begin
  if p_slug is null or length(p_slug) < 8 then
    return null;
  end if;

  select * into r from public.leads where slug = p_slug and demo_publicada;
  if not found then
    return null;
  end if;

  if p_contar then
    update public.leads
       set visualizacoes = visualizacoes + 1, ultima_visualizacao = now()
     where id = r.id;
  end if;

  return jsonb_build_object(
    'slug', r.slug, 'nome', r.nome, 'categoria', r.categoria, 'nicho', r.nicho,
    'telefone', r.telefone, 'celular', r.celular, 'whatsapp', r.whatsapp,
    'endereco', r.endereco, 'bairro', r.bairro, 'cidade', r.cidade, 'uf', r.uf,
    'maps_url', r.maps_url, 'instagram', r.instagram, 'facebook', r.facebook,
    'nota', r.nota, 'avaliacoes', r.avaliacoes
  );
end;
$$;

revoke all on function public.demo_publica(text, boolean) from public;
grant execute on function public.demo_publica(text, boolean) to anon, authenticated;
revoke all on function public.tocar_updated_at() from public, anon, authenticated;
