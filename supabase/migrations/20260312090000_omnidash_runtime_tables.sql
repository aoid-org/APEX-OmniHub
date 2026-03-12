-- OmniDash runtime tables
create table if not exists public.user_dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  layout_version text not null default 'v1',
  panes jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  unique (user_id)
);
alter table public.user_dashboard_layouts enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_dashboard_layouts'
      and policyname = 'Users own their layout'
  ) then
    create policy "Users own their layout" on public.user_dashboard_layouts
      for all using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.user_ops_controls (
  user_id uuid references auth.users primary key,
  demo_mode bool not null default true,
  auto_pilot bool not null default false,
  guardian_mode bool not null default true,
  live_data bool not null default false,
  updated_at timestamptz default now()
);
alter table public.user_ops_controls enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_ops_controls'
      and policyname = 'Users own their ops'
  ) then
    create policy "Users own their ops" on public.user_ops_controls
      for all using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.omnihub_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  events_tracked int not null default 0,
  system_health numeric(5,2) not null default 100,
  guardian_loops int not null default 0,
  stale_checks int not null default 0,
  recorded_at timestamptz default now()
);
alter table public.omnihub_analytics enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'omnihub_analytics'
      and policyname = 'Users read their analytics'
  ) then
    create policy "Users read their analytics" on public.omnihub_analytics
      for select using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.omnitrace_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  event_type text not null,
  event_text text not null,
  severity text not null check (severity in ('info','warning','error','success')),
  color_token text not null check (color_token in ('green','warn','purple','red','cyan','blue')),
  created_at timestamptz default now()
);
alter table public.omnitrace_events enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'omnitrace_events'
      and policyname = 'Users read their traces'
  ) then
    create policy "Users read their traces" on public.omnitrace_events
      for select using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','warning','breach')),
  last_scan timestamptz default now(),
  gateway_count int not null default 0
);
alter table public.security_audit_log enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'security_audit_log'
      and policyname = 'Users read their audits'
  ) then
    create policy "Users read their audits" on public.security_audit_log
      for select using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','paused','idle')),
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.agent_sessions enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'agent_sessions'
      and policyname = 'Users own their sessions'
  ) then
    create policy "Users own their sessions" on public.agent_sessions
      for all using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.telemetry_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  query_id uuid not null,
  injected_at bigint not null,
  omnitrace_ack_at bigint,
  analytics_ack_at bigint,
  app_api_ack_at bigint,
  propagation_delta_ms int,
  status text not null check (status in ('pass','drift','fail')),
  drift_sources jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table public.telemetry_audit_log enable row level security;
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'telemetry_audit_log'
      and policyname = 'Users read their telemetry audits'
  ) then
    create policy "Users read their telemetry audits" on public.telemetry_audit_log
      for select using (auth.uid() = user_id);
  end if;
end $$;
create index if not exists telemetry_audit_log_user_id_created_at_idx
  on public.telemetry_audit_log (user_id, created_at desc);
