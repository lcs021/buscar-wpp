-- Persistent, tenant-scoped job queue. Commercial sending is intentionally out of scope.
create table if not exists public.operacao_config (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  paused boolean not null default true,
  timezone text not null default 'America/Sao_Paulo' check (timezone = 'America/Sao_Paulo'),
  starts_at time not null default '09:00',
  ends_at time not null default '18:00',
  weekdays smallint[] not null default array[1,2,3,4,5]::smallint[],
  daily_limit integer not null default 50 check (daily_limit between 1 and 100),
  max_concurrency integer not null default 1 check (max_concurrency between 1 and 3),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  check (cardinality(weekdays) between 1 and 7),
  check (weekdays <@ array[1,2,3,4,5,6,7]::smallint[])
);

create table if not exists public.operacao_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind = 'search'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  request_key uuid not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed','cancelled')),
  scheduled_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  lease_until timestamptz,
  next_run_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_key)
);
create index if not exists operacao_jobs_due_idx on public.operacao_jobs (status, next_run_at, created_at);
create index if not exists operacao_jobs_user_idx on public.operacao_jobs (user_id, created_at desc);

create table if not exists public.operacao_runs (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.operacao_jobs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt integer not null check (attempt > 0),
  status text not null check (status in ('running','succeeded','failed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error text not null default '',
  unique (job_id, attempt)
);
create index if not exists operacao_runs_user_idx on public.operacao_runs (user_id, started_at desc);

alter table public.operacao_config enable row level security;
alter table public.operacao_jobs enable row level security;
alter table public.operacao_runs enable row level security;

drop policy if exists "configuracao da operacao do dono" on public.operacao_config;
create policy "configuracao da operacao do dono" on public.operacao_config
  for all to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists "jobs da operacao do dono" on public.operacao_jobs;
create policy "jobs da operacao do dono" on public.operacao_jobs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "execucoes da operacao do dono" on public.operacao_runs;
create policy "execucoes da operacao do dono" on public.operacao_runs
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.operacao_config, public.operacao_jobs, public.operacao_runs from public, anon;
grant select, insert, update on public.operacao_config to authenticated;
grant select on public.operacao_jobs, public.operacao_runs to authenticated;
grant all on public.operacao_config, public.operacao_jobs, public.operacao_runs to service_role;
revoke all on sequence public.operacao_runs_id_seq from public, anon, authenticated;
grant usage, select on sequence public.operacao_runs_id_seq to service_role;

create or replace function public.enfileirar_pesquisa(p_payload jsonb, p_scheduled_at timestamptz, p_request_key uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_tipo text := btrim(p_payload->>'tipo');
  v_cidade text := btrim(p_payload->>'cidade');
  v_uf text := upper(btrim(p_payload->>'uf'));
  v_bairro text := btrim(coalesce(p_payload->>'bairro', ''));
  v_qtd integer := coalesce((p_payload->>'quantidade')::integer, 20);
  v_id uuid;
begin
  if v_user_id is null then raise exception 'login required' using errcode = '42501'; end if;
  if jsonb_typeof(p_payload) <> 'object' or p_request_key is null then raise exception 'invalid job'; end if;
  if v_tipo is null or length(v_tipo) not between 2 and 100
    or v_cidade is null or length(v_cidade) not between 2 and 100
    or v_bairro is null or length(v_bairro) > 100
    or v_tipo ~ '[[:cntrl:]]' or v_cidade ~ '[[:cntrl:]]' or v_bairro ~ '[[:cntrl:]]' then
    raise exception 'invalid search text';
  end if;
  if v_uf not in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO') then
    raise exception 'invalid UF';
  end if;
  if v_qtd not between 1 and 60 then raise exception 'invalid quantity'; end if;
  if p_scheduled_at is null or p_scheduled_at < now() - interval '1 minute'
    or p_scheduled_at > now() + interval '30 days' then raise exception 'invalid schedule time'; end if;
  if (select count(*) from public.operacao_jobs j where j.user_id = v_user_id and j.status in ('queued','running')) >= 100 then
    raise exception 'queue limit reached';
  end if;
  insert into public.operacao_jobs (user_id, kind, payload, request_key, scheduled_at, next_run_at)
  values (v_user_id, 'search', jsonb_build_object('tipo', v_tipo, 'cidade', v_cidade, 'uf', v_uf,
    'bairro', v_bairro, 'quantidade', v_qtd), p_request_key, p_scheduled_at, p_scheduled_at)
  on conflict (user_id, request_key) do update set request_key = excluded.request_key
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.enfileirar_pesquisa(jsonb, timestamptz, uuid) from public, anon;
grant execute on function public.enfileirar_pesquisa(jsonb, timestamptz, uuid) to authenticated;

create or replace function public.limitar_busca_operacao(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chamadas integer;
begin
  if p_user_id is null then return false; end if;
  insert into public.limites_busca as atual (user_id, janela_inicio, chamadas)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update
    set janela_inicio = case when atual.janela_inicio <= now() - interval '1 minute' then now() else atual.janela_inicio end,
        chamadas = case when atual.janela_inicio <= now() - interval '1 minute' then 1 else atual.chamadas + 1 end
  returning chamadas into v_chamadas;
  return v_chamadas <= 5;
end;
$$;
revoke all on function public.limitar_busca_operacao(uuid) from public, anon, authenticated;
grant execute on function public.limitar_busca_operacao(uuid) to service_role;

create or replace function public.claim_operacao_jobs(p_limit integer default 10)
returns setof public.operacao_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_config public.operacao_config%rowtype;
  v_job public.operacao_jobs%rowtype;
  v_running integer;
  v_done_today integer;
  v_slots integer;
  v_start timestamptz;
begin
  if p_limit not between 1 and 10 then raise exception 'invalid claim limit'; end if;

  update public.operacao_runs r set status = 'failed', ended_at = now(), error = 'worker lease expired'
  from public.operacao_jobs j
  where r.job_id = j.id and r.attempt = j.attempts and r.status = 'running'
    and j.status = 'running' and j.lease_until <= now();
  update public.operacao_jobs j set
    status = case when j.attempts >= j.max_attempts then 'failed' else 'queued' end,
    next_run_at = now() + make_interval(mins => least(30, power(2, least(j.attempts, 5))::integer)),
    lease_until = null, last_error = 'worker lease expired', updated_at = now()
  where j.status = 'running' and j.lease_until <= now();

  for v_config in
    select c.* from public.operacao_config c
    where c.enabled and not c.paused
      and extract(isodow from (now() at time zone c.timezone))::smallint = any(c.weekdays)
      and (now() at time zone c.timezone)::time >= c.starts_at
      and (now() at time zone c.timezone)::time < c.ends_at
      and exists (select 1 from public.operacao_jobs j where j.user_id = c.user_id and j.status = 'queued' and j.next_run_at <= now())
    order by c.user_id
    for update skip locked
  loop
    exit when p_limit <= 0;
    select count(*)::integer into v_running from public.operacao_jobs j
      where j.user_id = v_config.user_id and j.status = 'running' and j.lease_until > now();
    v_start := date_trunc('day', now() at time zone v_config.timezone) at time zone v_config.timezone;
    select count(*)::integer into v_done_today from public.operacao_jobs j
      where j.user_id = v_config.user_id and j.status = 'succeeded' and j.completed_at >= v_start;
    v_slots := least(v_config.max_concurrency - v_running, v_config.daily_limit - v_done_today, p_limit);
    if v_slots <= 0 then continue; end if;
    for v_job in
      select j.* from public.operacao_jobs j
      where j.user_id = v_config.user_id and j.status = 'queued' and j.next_run_at <= now()
      order by j.next_run_at, j.created_at
      limit v_slots
      for update skip locked
    loop
      update public.operacao_jobs j set status = 'running', attempts = j.attempts + 1,
        lease_until = now() + interval '10 minutes', last_error = '', updated_at = now()
      where j.id = v_job.id returning j.* into v_job;
      insert into public.operacao_runs (job_id, user_id, attempt, status)
      values (v_job.id, v_job.user_id, v_job.attempts, 'running');
      return next v_job;
      p_limit := p_limit - 1;
      exit when p_limit <= 0;
    end loop;
  end loop;
  return;
end;
$$;
revoke all on function public.claim_operacao_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_operacao_jobs(integer) to service_role;

create or replace function public.finalizar_operacao_job(p_job_id uuid, p_sucesso boolean, p_resultado jsonb default '{}'::jsonb, p_erro text default '')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.operacao_jobs%rowtype;
  v_status text;
  v_erro text := left(coalesce(p_erro, ''), 1000);
begin
  select * into v_job from public.operacao_jobs where id = p_job_id for update;
  if not found or v_job.status <> 'running' then raise exception 'job not running'; end if;
  if p_sucesso then
    v_status := 'succeeded';
    update public.operacao_jobs set status = v_status, completed_at = now(), lease_until = null,
      last_error = '', updated_at = now() where id = p_job_id;
  else
    v_status := case when v_job.attempts < v_job.max_attempts then 'queued' else 'failed' end;
    update public.operacao_jobs set status = v_status, completed_at = null, lease_until = null,
      next_run_at = case when v_status = 'queued' then now() + make_interval(mins => least(30, power(2, least(v_job.attempts, 5))::integer)) else next_run_at end,
      last_error = v_erro, updated_at = now() where id = p_job_id;
  end if;
  update public.operacao_runs set status = case when p_sucesso then 'succeeded' else 'failed' end,
    ended_at = now(), result = coalesce(p_resultado, '{}'::jsonb), error = v_erro
  where job_id = p_job_id and attempt = v_job.attempts and status = 'running';
end;
$$;
revoke all on function public.finalizar_operacao_job(uuid, boolean, jsonb, text) from public, anon, authenticated;
grant execute on function public.finalizar_operacao_job(uuid, boolean, jsonb, text) to service_role;

create or replace function public.tocar_operacao_atualizado()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists operacao_config_updated_at on public.operacao_config;
create trigger operacao_config_updated_at before update on public.operacao_config
for each row execute function public.tocar_operacao_atualizado();
drop trigger if exists operacao_jobs_updated_at on public.operacao_jobs;
create trigger operacao_jobs_updated_at before update on public.operacao_jobs
for each row execute function public.tocar_operacao_atualizado();
revoke all on function public.tocar_operacao_atualizado() from public, anon, authenticated;

