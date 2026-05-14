-- Step 1: Multi-branch foundation (safe migration, no destructive drops)
-- Goal:
-- 1) Add branches (sedes) support
-- 2) Add memberships for owner/admin/barber roles per branch
-- 3) Attach current data to a default branch so the app keeps working
--
-- Run in Supabase SQL Editor.

begin;

-- 0) UUID helper (usually already enabled in Supabase)
create extension if not exists "pgcrypto";

-- 1) Branches table (sedes / barberias)
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  address text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional trigger-less updated_at maintenance via manual updates in app (for now).

-- 2) Memberships table (roles by branch)
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'barber')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists memberships_user_branch_role_uq
  on public.memberships(user_id, branch_id, role);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_branch_idx on public.memberships(branch_id);

-- 3) Add branch_id to current domain tables
alter table public.services
  add column if not exists branch_id uuid references public.branches(id);

alter table public.barbers
  add column if not exists branch_id uuid references public.branches(id);

alter table public.business_hours
  add column if not exists branch_id uuid references public.branches(id);

alter table public.appointments
  add column if not exists branch_id uuid references public.branches(id);

-- 4) Create default branch if there are none
insert into public.branches (name, slug, address, phone, is_active)
select 'Sede Principal', 'sede-principal', null, null, true
where not exists (select 1 from public.branches);

-- 5) Backfill existing rows to default branch
do $$
declare
  v_default_branch uuid;
begin
  -- take the oldest branch as default
  select b.id into v_default_branch
  from public.branches b
  order by b.created_at asc
  limit 1;

  -- Services
  update public.services
  set branch_id = v_default_branch
  where branch_id is null;

  -- Barbers
  update public.barbers
  set branch_id = v_default_branch
  where branch_id is null;

  -- Business hours: first try from barber, fallback default
  update public.business_hours bh
  set branch_id = coalesce(b.branch_id, v_default_branch)
  from public.barbers b
  where bh.barber_id = b.id
    and bh.branch_id is null;

  update public.business_hours
  set branch_id = v_default_branch
  where branch_id is null;

  -- Appointments: first try from barber, fallback default
  update public.appointments a
  set branch_id = coalesce(b.branch_id, v_default_branch)
  from public.barbers b
  where a.barber_id = b.id
    and a.branch_id is null;

  update public.appointments
  set branch_id = v_default_branch
  where branch_id is null;
end $$;

-- 6) Enforce non-null in core tables after backfill
alter table public.services
  alter column branch_id set not null;

alter table public.barbers
  alter column branch_id set not null;

alter table public.business_hours
  alter column branch_id set not null;

alter table public.appointments
  alter column branch_id set not null;

-- 7) Helpful indexes for performance
create index if not exists services_branch_idx on public.services(branch_id);
create index if not exists barbers_branch_idx on public.barbers(branch_id);
create index if not exists business_hours_branch_idx on public.business_hours(branch_id);
create index if not exists appointments_branch_idx on public.appointments(branch_id);

-- 8) Seed memberships from current profiles.role (optional but practical)
-- NOTE: This maps existing admins to owner role for now (can be edited later).
do $$
declare
  v_default_branch uuid;
begin
  select b.id into v_default_branch
  from public.branches b
  order by b.created_at asc
  limit 1;

  insert into public.memberships (user_id, branch_id, role, is_active)
  select p.id, v_default_branch,
         case when p.role = 'admin' then 'owner' else 'barber' end,
         true
  from public.profiles p
  where p.role in ('admin')
  on conflict (user_id, branch_id, role) do nothing;
end $$;

commit;

-- Verification queries (run after script):
-- select id, name, slug from public.branches;
-- select count(*) as services_without_branch from public.services where branch_id is null;
-- select count(*) as barbers_without_branch from public.barbers where branch_id is null;
-- select count(*) as bh_without_branch from public.business_hours where branch_id is null;
-- select count(*) as appt_without_branch from public.appointments where branch_id is null;

