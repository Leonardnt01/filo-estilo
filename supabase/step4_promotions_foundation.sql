-- Step 4: Promotions foundation
-- Goal:
-- 1) Create promotions table if it does not exist
-- 2) Add basic indexes for public/admin reads
-- 3) Apply RLS policies expected by the app
--
-- Prerequisites:
-- - step1_multibranch_foundation.sql
-- - step2_rls_policies.sql helper functions (public.is_admin, public.can_manage_branch)
--
-- Run in Supabase SQL Editor.

begin;

create extension if not exists "pgcrypto";

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id) on delete cascade,
  title text not null,
  description text,
  discount_percent integer not null check (discount_percent between 1 and 100),
  image_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_date_range_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists promotions_branch_idx
  on public.promotions(branch_id);

create index if not exists promotions_active_sort_idx
  on public.promotions(is_active, sort_order, created_at desc);

alter table public.promotions enable row level security;

grant select on table public.promotions to anon;
grant select, insert, update, delete on table public.promotions to authenticated;
grant all privileges on table public.promotions to service_role;

drop policy if exists "promotions_select_active_or_admin" on public.promotions;
create policy "promotions_select_active_or_admin"
on public.promotions
for select
to anon, authenticated
using (
  is_active = true
  or (branch_id is not null and public.can_manage_branch(branch_id))
  or (branch_id is null and public.is_admin())
);

drop policy if exists "promotions_insert_admin" on public.promotions;
create policy "promotions_insert_admin"
on public.promotions
for insert
to authenticated
with check (
  (branch_id is not null and public.can_manage_branch(branch_id))
  or (branch_id is null and public.is_admin())
);

drop policy if exists "promotions_update_admin" on public.promotions;
create policy "promotions_update_admin"
on public.promotions
for update
to authenticated
using (
  (branch_id is not null and public.can_manage_branch(branch_id))
  or (branch_id is null and public.is_admin())
)
with check (
  (branch_id is not null and public.can_manage_branch(branch_id))
  or (branch_id is null and public.is_admin())
);

drop policy if exists "promotions_delete_admin" on public.promotions;
create policy "promotions_delete_admin"
on public.promotions
for delete
to authenticated
using (
  (branch_id is not null and public.can_manage_branch(branch_id))
  or (branch_id is null and public.is_admin())
);

commit;

-- Verification queries:
-- select id, branch_id, title, discount_percent, is_active from public.promotions order by sort_order, created_at desc;
-- select schemaname, tablename, policyname from pg_policies where schemaname = 'public' and tablename = 'promotions';
