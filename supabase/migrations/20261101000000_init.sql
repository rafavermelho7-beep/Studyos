-- LIFE ENGINE — esquema inicial (Fase 1: fundação)
-- Princípios: usuário único, RLS em todas as tabelas (dono = auth.uid()),
-- auditoria append-only, memória com proveniência/confiança/validade temporal.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- utilitários
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Domínios válidos (DEC-001) — mantidos em sincronia com src/lib/domains.ts
create or replace function public.is_domain(d text) returns boolean
language sql immutable as $$
  select d is null or d in ('identidade','espiritualidade','saude','estudos','carreira',
    'financas','relacionamentos','ambiente','projetos','conhecimento','experiencias')
$$;

-- ---------------------------------------------------------------- perfil
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'America/Sao_Paulo',
  preferred_provider text check (preferred_provider in ('anthropic','openai')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- memória
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('fact','preference','value','belief','event','context','inference','hypothesis')),
  content text not null check (length(content) between 1 and 2000),
  domain text check (public.is_domain(domain)),
  sensitivity text not null default 'normal' check (sensitivity in ('normal','sensitive','restricted')),
  status text not null default 'active' check (status in ('active','proposed','outdated','rejected','archived')),
  confidence real not null default 0.7 check (confidence between 0 and 1),
  source text not null check (source in ('user_stated','user_confirmed','agent_inferred','imported','system')),
  source_ref jsonb not null default '{}'::jsonb,
  pinned boolean not null default false,
  valid_from date,
  valid_until date,
  supersedes uuid references public.memories(id) on delete set null,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  fts tsvector generated always as (to_tsvector('portuguese', content)) stored,
  -- inferências nunca nascem como fato declarado
  constraint inference_not_stated check (not (kind in ('inference','hypothesis') and source = 'user_stated'))
);
create index memories_user_status on public.memories(user_id, status);
create index memories_fts on public.memories using gin(fts);
create trigger memories_updated before update on public.memories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- objetivos e projetos
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  why text not null default '',
  domain text check (public.is_domain(domain)),
  horizon text not null default 'year' check (horizon in ('quarter','year','multi_year')),
  status text not null default 'active' check (status in ('draft','active','paused','done','dropped')),
  target_date date,
  progress smallint not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_user on public.goals(user_id, status);
create trigger goals_updated before update on public.goals
  for each row execute function public.set_updated_at();

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goal_id uuid references public.goals(id) on delete set null,
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  domain text check (public.is_domain(domain)),
  status text not null default 'active' check (status in ('planned','active','paused','done','dropped')),
  next_action text not null default '',
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_user on public.projects(user_id, status);
create trigger projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- Registro de decisões de vida (não confundir com o Decision Register do produto)
create table public.life_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  context text not null default '',
  options text not null default '',
  decision text not null default '',
  rationale text not null default '',
  domain text check (public.is_domain(domain)),
  decided_on date,
  review_on date,
  outcome text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger life_decisions_updated before update on public.life_decisions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- espaços e conversas
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Novo espaço' check (length(title) between 1 and 160),
  kind text not null default 'investigation' check (kind in ('ambient','investigation','domain','goal')),
  purpose text not null default '',
  domain text check (public.is_domain(domain)),
  goal_id uuid references public.goals(id) on delete set null,
  summary text not null default '',
  status text not null default 'active' check (status in ('active','archived')),
  pinned boolean not null default false,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index spaces_user on public.spaces(user_id, status, last_activity_at desc);
-- No máximo um espaço "ambient" por usuário
create unique index spaces_one_ambient on public.spaces(user_id) where kind = 'ambient';
create trigger spaces_updated before update on public.spaces
  for each row execute function public.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  role text not null check (role in ('user','assistant','note')),
  content text not null check (length(content) <= 40000),
  model text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index messages_space on public.messages(space_id, created_at);

-- ---------------------------------------------------------------- acompanhamento
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  energy smallint check (energy between 1 and 5),
  mood smallint check (mood between 1 and 5),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  note text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, day)
);
create trigger checkins_updated before update on public.checkins
  for each row execute function public.set_updated_at();

-- Equilíbrio: autoavaliação semanal por domínio (PEN-05 — definição provisória)
create table public.domain_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  domain text not null check (public.is_domain(domain) and domain is not null),
  week_start date not null,
  score smallint not null check (score between 0 and 10),
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, domain, week_start)
);

create table public.study_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  subject text not null default '',
  kind text not null default 'exam' check (kind in ('exam','deadline','presentation')),
  day date not null,
  created_at timestamptz not null default now()
);
create index study_events_user_day on public.study_events(user_id, day);

-- Saúde: agregados diários (nunca amostras brutas — minimização, DEC-013)
create table public.health_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  sleep_minutes integer check (sleep_minutes between 0 and 1440),
  resting_hr smallint check (resting_hr between 20 and 250),
  hrv_ms smallint check (hrv_ms between 0 and 500),
  steps integer check (steps between 0 and 200000),
  active_kcal integer check (active_kcal between 0 and 20000),
  workout_minutes integer check (workout_minutes between 0 and 1440),
  workouts smallint check (workouts between 0 and 50),
  source text not null default 'apple_health_shortcut',
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- inteligência
create table public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('problem','opportunity','pattern','conflict','attention')),
  title text not null,
  body text not null default '',
  domain text check (public.is_domain(domain)),
  evidence jsonb not null default '{}'::jsonb,
  confidence real not null default 0.5 check (confidence between 0 and 1),
  origin text not null check (origin in ('rule','ai')),
  status text not null default 'new' check (status in ('new','seen','dismissed','acted')),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (user_id, dedupe_key)
);
create index insights_user_status on public.insights(user_id, status, created_at desc);

create table public.syntheses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('daily','weekly')),
  period_start date not null,
  content text not null,
  model text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, period_start)
);

-- Propostas do agente que exigem confirmação (matriz de permissões)
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('create_goal','create_project','record_decision','confirm_memory','update_goal_status')),
  payload jsonb not null,
  rationale text not null default '',
  status text not null default 'pending' check (status in ('pending','accepted','rejected','expired')),
  space_id uuid references public.spaces(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index proposals_user_status on public.proposals(user_id, status);

-- ---------------------------------------------------------------- governança
create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  local_day date not null,
  task text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd numeric(12,6) not null default 0,
  cost_brl numeric(12,4) not null default 0,
  ok boolean not null default true,
  error text
);
create index ai_usage_user_day on public.ai_usage(user_id, local_day);

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  actor text not null check (actor in ('user','agent','system')),
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb
);
create index audit_user_time on public.audit_log(user_id, created_at desc);

create table public.ingest_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  token_hash text not null unique,
  scope text not null default 'health' check (scope in ('health')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- ---------------------------------------------------------------- RLS
do $$
declare t text;
begin
  foreach t in array array['memories','goals','projects','life_decisions','spaces','messages',
    'checkins','domain_ratings','study_events','health_daily','insights','syntheses','proposals',
    'ai_usage','ingest_tokens']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy owner_all on public.%I for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t);
  end loop;
end $$;

alter table public.profiles enable row level security;
create policy owner_all on public.profiles for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Auditoria: append-only (sem update/delete para usuários)
alter table public.audit_log enable row level security;
create policy audit_insert on public.audit_log for insert to authenticated with check (user_id = auth.uid());
create policy audit_select on public.audit_log for select to authenticated using (user_id = auth.uid());

-- Mensagens só podem apontar para espaços do próprio usuário
create or replace function public.message_space_owner() returns trigger
language plpgsql as $$
begin
  if not exists (select 1 from public.spaces s where s.id = new.space_id and s.user_id = new.user_id) then
    raise exception 'space does not belong to user';
  end if;
  update public.spaces set last_activity_at = now() where id = new.space_id;
  return new;
end $$;
create trigger messages_owner before insert on public.messages
  for each row execute function public.message_space_owner();

-- ---------------------------------------------------------------- funções
-- Recuperação de memória por relevância (FTS em português, termos em OR).
-- security invoker => RLS se aplica. Exclui restritas e inválidas.
create or replace function public.match_memories(p_query text, p_limit int default 12)
returns setof public.memories
language sql stable security invoker set search_path = public as $$
  with q as (
    select nullif(string_agg(lexeme, ' | '), '') as expr
    from unnest(to_tsvector('portuguese', coalesce(p_query, ''))) as u(lexeme, positions, weights)
  )
  select m.* from public.memories m, q
  where q.expr is not null
    and m.status = 'active'
    and m.sensitivity <> 'restricted'
    and (m.valid_until is null or m.valid_until >= current_date)
    and m.fts @@ to_tsquery('portuguese', q.expr)
  order by ts_rank(m.fts, to_tsquery('portuguese', q.expr)) * m.confidence desc, m.updated_at desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- Gasto agregado de IA (mês e dia locais)
create or replace function public.ai_spend(p_month_start date, p_today date)
returns table(month_brl numeric, today_brl numeric)
language sql stable security invoker set search_path = public as $$
  select coalesce(sum(cost_brl) filter (where local_day >= p_month_start), 0),
         coalesce(sum(cost_brl) filter (where local_day = p_today), 0)
  from public.ai_usage where user_id = auth.uid() and local_day >= p_month_start
$$;

-- Ingestão de saúde via token (Atalhos do iOS). security definer: valida o hash
-- do token e grava apenas agregados do dono do token. A chave anônima pode chamar,
-- mas sem token válido nada acontece. Evita usar a service role key no app.
create or replace function public.ingest_health_daily(p_token text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_tok uuid;
  v_row jsonb;
  v_count int := 0;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 200 then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  select id, user_id into v_tok, v_user from public.ingest_tokens
    where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and revoked_at is null;
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then
    raise exception 'invalid payload' using errcode = '22023';
  end if;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    insert into public.health_daily as h (user_id, day, sleep_minutes, resting_hr, hrv_ms, steps,
      active_kcal, workout_minutes, workouts, source, updated_at)
    values (v_user, (v_row->>'day')::date,
      (v_row->>'sleep_minutes')::int, (v_row->>'resting_hr')::smallint, (v_row->>'hrv_ms')::smallint,
      (v_row->>'steps')::int, (v_row->>'active_kcal')::int, (v_row->>'workout_minutes')::int,
      (v_row->>'workouts')::smallint, 'apple_health_shortcut', now())
    on conflict (user_id, day) do update set
      sleep_minutes = coalesce(excluded.sleep_minutes, h.sleep_minutes),
      resting_hr = coalesce(excluded.resting_hr, h.resting_hr),
      hrv_ms = coalesce(excluded.hrv_ms, h.hrv_ms),
      steps = coalesce(excluded.steps, h.steps),
      active_kcal = coalesce(excluded.active_kcal, h.active_kcal),
      workout_minutes = coalesce(excluded.workout_minutes, h.workout_minutes),
      workouts = coalesce(excluded.workouts, h.workouts),
      updated_at = now();
    v_count := v_count + 1;
  end loop;
  update public.ingest_tokens set last_used_at = now() where id = v_tok;
  insert into public.audit_log(user_id, actor, action, entity, detail)
    values (v_user, 'system', 'ingest', 'health_daily', jsonb_build_object('rows', v_count));
  return v_count;
end $$;

revoke all on function public.ingest_health_daily(text, jsonb) from public;
grant execute on function public.ingest_health_daily(text, jsonb) to anon, authenticated;

-- Cria perfil automaticamente para novos usuários de auth
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
