
-- Phase 4: Monetization & Scale
-- Usage Metering & Rate Limiting Tables

-- 1. Usage Metering Table
create table if not exists public.usage_metering (
  id uuid default gen_random_uuid() primary key,
  tenant_id uuid not null,
  user_id uuid not null references auth.users(id),
  provider text not null,
  model text not null,
  input_tokens int default 0,
  output_tokens int default 0,
  region text default 'us',
  timestamp timestamptz default now()
);

-- RLS: Users can view their own usage
alter table public.usage_metering enable row level security;

create policy "Users can view own usage"
  on public.usage_metering
  for select
  using (auth.uid() = user_id);

-- Service role can insert (for edge functions)
create policy "Service role can insert usage"
  on public.usage_metering
  for insert
  with check (true); -- Service role bypasses RLS anyway, but good to be explicit if using role

-- Indexes for aggregation queries
create index idx_usage_metering_tenant_timestamp 
  on public.usage_metering(tenant_id, timestamp);

-- 2. Rate Limiting Helper (Simple Sliding Window via DB)
-- We'll just query usage_metering for MVP, but a dedicated table is faster for high volume.
-- Let's create a dedicated leaky bucket table if high-scale, 
-- but for "Phase 4 MVP", direct count on index is acceptable for <10k users.
-- We'll add a function to check rate limit efficiently.

create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_limit_count int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select count(*)
  into v_count
  from public.usage_metering
  where user_id = p_user_id
    and timestamp > (now() - (p_window_seconds || ' seconds')::interval);
    
  return v_count < p_limit_count;
end;
$$;
