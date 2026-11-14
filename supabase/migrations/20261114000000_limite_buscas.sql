-- Limita chamadas à Google Places por usuário sem confiar em dados editáveis pelo cliente.
-- Execute depois das migrações anteriores no Supabase SQL Editor.

create table if not exists public.limites_busca (
  user_id uuid primary key references auth.users (id) on delete cascade,
  janela_inicio timestamptz not null default now(),
  chamadas integer not null default 0 check (chamadas >= 0)
);

alter table public.limites_busca enable row level security;
revoke all on public.limites_busca from public, anon, authenticated;

create or replace function public.limitar_busca()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_chamadas integer;
begin
  if v_user_id is null then
    return false;
  end if;

  insert into public.limites_busca as atual (user_id, janela_inicio, chamadas)
  values (v_user_id, now(), 1)
  on conflict (user_id) do update
    set janela_inicio = case
          when atual.janela_inicio <= now() - interval '1 minute' then now()
          else atual.janela_inicio
        end,
        chamadas = case
          when atual.janela_inicio <= now() - interval '1 minute' then 1
          else atual.chamadas + 1
        end
  returning chamadas into v_chamadas;

  return v_chamadas <= 5;
end;
$$;

revoke all on function public.limitar_busca() from public, anon;
grant execute on function public.limitar_busca() to authenticated;
