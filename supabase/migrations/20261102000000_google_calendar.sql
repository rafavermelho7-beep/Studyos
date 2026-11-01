-- LIFE ENGINE — integração com Google Agenda (DEC-038: PEN-02 = Google)
-- Leitura: eventos dos últimos 30 e próximos 60 dias, só título e horário (minimização; sem
-- participantes/descrição — R-17). Escrita: apenas via proposta confirmada pelo usuário (DEC-T20).

create table public.integrations (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google_calendar')),
  -- tokens cifrados com AES-256-GCM no servidor (TOKEN_ENCRYPTION_KEY); nunca em claro
  refresh_token_enc text not null,
  access_token_enc text,
  access_expires_at timestamptz,
  scope text not null default '',
  account_email text,
  calendar_id text not null default 'primary',
  status text not null default 'active' check (status in ('active','error')),
  last_error text,
  last_sync_at timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
create trigger integrations_updated before update on public.integrations
  for each row execute function public.set_updated_at();

create table public.calendar_events (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  google_id text not null,
  title text not null default '',
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  day date not null,
  created_by_engine boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (user_id, google_id)
);
create index calendar_events_user_day on public.calendar_events(user_id, day);

alter table public.integrations enable row level security;
alter table public.calendar_events enable row level security;
create policy owner_all on public.integrations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy owner_all on public.calendar_events for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nova proposta: criar evento na agenda (sempre com confirmação)
alter table public.proposals drop constraint proposals_type_check;
alter table public.proposals add constraint proposals_type_check check (type in
  ('create_goal','create_project','record_decision','confirm_memory','update_goal_status','create_calendar_event'));
