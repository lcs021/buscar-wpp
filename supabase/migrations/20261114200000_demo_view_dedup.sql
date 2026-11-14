-- Count each public demo at most once per UTC day. No visitor identifiers are stored.
-- p_contar remains in the RPC signature for compatibility with cached clients, but is ignored.
create table if not exists public.demo_view_counts (
  lead_id uuid not null references public.leads (id) on delete cascade,
  view_day date not null,
  created_at timestamptz not null default now(),
  primary key (lead_id, view_day)
);

alter table public.demo_view_counts enable row level security;
revoke all on public.demo_view_counts from public, anon, authenticated;

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

  -- Ignore the caller-controlled legacy flag. The database deduplicates by demo and UTC day.
  insert into public.demo_view_counts (lead_id, view_day)
  values (r.id, (now() at time zone 'UTC')::date)
  on conflict (lead_id, view_day) do nothing;

  if found then
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
