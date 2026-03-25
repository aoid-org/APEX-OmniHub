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

create table if not exists public.user_ops_controls (
  user_id uuid references auth.users primary key,
  demo_mode bool not null default true,
  auto_pilot bool not null default false,
  guardian_mode bool not null default true,
  live_data bool not null default false,
  updated_at timestamptz default now()
);
alter table public.user_ops_controls enable row level security;

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

create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','warning','breach')),
  last_scan timestamptz default now(),
  gateway_count int not null default 0
);
alter table public.security_audit_log enable row level security;

create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  status text not null check (status in ('active','paused','idle')),
  started_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.agent_sessions enable row level security;

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
declare
  _schema constant text := 'public';
  _policy_specs constant jsonb := jsonb_build_array(
    jsonb_build_object(
      'table', 'user_dashboard_layouts',
      'policy', 'Users own their layout',
      'clause', 'for all using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'user_ops_controls',
      'policy', 'Users own their ops',
      'clause', 'for all using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'omnihub_analytics',
      'policy', 'Users read their analytics',
      'clause', 'for select using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'omnitrace_events',
      'policy', 'Users read their traces',
      'clause', 'for select using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'security_audit_log',
      'policy', 'Users read their audits',
      'clause', 'for select using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'agent_sessions',
      'policy', 'Users own their sessions',
      'clause', 'for all using (auth.uid() = user_id)'
    ),
    jsonb_build_object(
      'table', 'telemetry_audit_log',
      'policy', 'Users read their telemetry audits',
      'clause', 'for select using (auth.uid() = user_id)'
    )
  );
  _policy jsonb;
begin
  for _policy in
    select value
    from jsonb_array_elements(_policy_specs)
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = _schema
        and tablename = _policy->>'table'
        and policyname = _policy->>'policy'
    ) then
      execute format(
        'create policy %I on %I.%I %s',
        _policy->>'policy',
        _schema,
        _policy->>'table',
        _policy->>'clause'
      );
    end if;
  end loop;
end $$;

create index if not exists telemetry_audit_log_user_id_created_at_idx
  on public.telemetry_audit_log (user_id, created_at desc);
