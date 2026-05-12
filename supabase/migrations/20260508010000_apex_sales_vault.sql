-- APEX-SALES Lead Vault CRM backbone.
-- Owns lead capture and pipeline events in Supabase with service-role-only access.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  company text,
  title text,
  offer_interest text check (offer_interest in (
    'A-SBBL', 'B-Sprint', 'C-OmniHub', 'D-Armageddon', 'E-FLOWBills', 'TDA', 'Other'
  )),
  source text,
  status text not null default 'new' check (status in (
    'new', 'contacted', 'replied', 'call-booked', 'proposal-sent', 'closed-won',
    'closed-lost', 'nurture'
  )),
  notes text,
  next_action text,
  next_action_due date,
  last_contact_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) ,
  event_type text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_offer_interest_idx on public.leads (offer_interest);
create index if not exists leads_next_action_due_idx on public.leads (next_action_due);
create index if not exists lead_events_lead_id_created_at_idx on public.lead_events (lead_id, created_at desc);

create or replace function public.touch_leads_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- drop trigger if exists touch_leads_updated_at on public.leads;
create trigger touch_leads_updated_at
before update on public.leads
for each row
execute function public.touch_leads_updated_at();

alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

-- Supabase service keys bypass RLS, but this explicit policy documents the only accepted role.
-- drop policy if exists service_role_full_access on public.leads;
create policy service_role_full_access
on public.leads
as permissive
for all
to service_role
using (true)
with check (true);

-- drop policy if exists service_role_full_access on public.lead_events;
create policy service_role_full_access
on public.lead_events
as permissive
for all
to service_role
using (true)
with check (true);

revoke all on public.leads from public, anon, authenticated;
revoke all on public.lead_events from public, anon, authenticated;
grant all on public.leads to service_role;
grant all on public.lead_events to service_role;

with seed_defaults as (
  select
    '[TBD]'::text as email,
    '[PROSPECT]'::text as company,
    'seed'::text as source,
    'new'::text as status,
    'Replace with qualified prospect.'::text as next_action
),
seed_leads (name, offer_interest, notes) as (
  values
    ('Sample Lead — Offer A', 'A-SBBL', 'Template placeholder for SBBL outreach.'),
    ('Sample Lead — Offer C', 'C-OmniHub', 'Template placeholder for OmniHub outreach.'),
    ('Sample Lead — Offer D', 'D-Armageddon', 'Template placeholder for Armageddon outreach.')
)
insert into public.leads (name, email, company, offer_interest, source, status, notes, next_action)
select
  seed_leads.name,
  seed_defaults.email,
  seed_defaults.company,
  seed_leads.offer_interest,
  seed_defaults.source,
  seed_defaults.status,
  seed_leads.notes,
  seed_defaults.next_action
from seed_leads
cross join seed_defaults
where not exists (
  select 1
  from public.leads existing_leads
  where existing_leads.name = seed_leads.name
    and existing_leads.source = seed_defaults.source
);
