-- LIFE ENGINE — Fase 3: Radar de oportunidades e Finanças leves.

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category text not null check (category in ('cursos_eventos','experiencias')),
  title text not null check (length(title) between 1 and 200),
  summary text not null default '',
  why text not null default '',
  url text not null check (url ~ '^https?://'),
  source_domain text not null default '',
  date_start date,
  deadline date,
  location text not null default '',
  price text not null default '',
  status text not null default 'new' check (status in ('new','saved','dismissed','scheduled')),
  found_at timestamptz not null default now(),
  unique (user_id, url)
);
create index opportunities_user_status on public.opportunities(user_id, status, found_at desc);

create table public.radar_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  trigger text not null check (trigger in ('auto','manual')),
  status text not null check (status in ('ok','error')),
  found integer not null default 0,
  searches integer not null default 0,
  cost_brl numeric(10,4) not null default 0,
  error text
);
create index radar_runs_user on public.radar_runs(user_id, created_at desc);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  amount numeric(10,2) not null check (amount > 0 and amount < 1000000),
  category text not null check (category in ('alimentacao','transporte','moradia','lazer','compras','saude','educacao','assinaturas','outros')),
  note text not null default '' check (length(note) <= 200),
  created_at timestamptz not null default now()
);
create index expenses_user_day on public.expenses(user_id, day);

do $$
declare t text;
begin
  foreach t in array array['opportunities','radar_runs','expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy owner_all on public.%I for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$p$, t);
  end loop;
end $$;
