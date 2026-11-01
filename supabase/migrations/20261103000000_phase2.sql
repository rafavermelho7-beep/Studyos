-- LIFE ENGINE — Fase 2: sessões de estudo (UC-03), resumo de espaços, substituição de memória.

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  subject text not null check (length(subject) between 1 and 80),
  minutes smallint not null check (minutes between 5 and 720),
  focus smallint check (focus between 1 and 5),
  created_at timestamptz not null default now()
);
create index study_sessions_user_day on public.study_sessions(user_id, day);
alter table public.study_sessions enable row level security;
create policy owner_all on public.study_sessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Resumo incremental dos espaços: quantas mensagens o resumo atual cobre.
alter table public.spaces add column summary_msg_count integer not null default 0;
alter table public.spaces add column summary_updated_at timestamptz;
