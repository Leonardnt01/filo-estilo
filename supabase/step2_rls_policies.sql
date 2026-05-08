-- Step 2: RLS + policies + booking integrity for barber platform
-- Execute this script in Supabase SQL Editor.

begin;

-- 1) Helper function: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 2) Enable RLS
alter table if exists public.profiles enable row level security;
alter table if exists public.services enable row level security;
alter table if exists public.barbers enable row level security;
alter table if exists public.business_hours enable row level security;
alter table if exists public.appointments enable row level security;

-- 3) Drop old policies to keep script idempotent
-- profiles

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;

-- services

drop policy if exists "services_select_active_or_admin" on public.services;
drop policy if exists "services_insert_admin" on public.services;
drop policy if exists "services_update_admin" on public.services;
drop policy if exists "services_delete_admin" on public.services;

-- barbers

drop policy if exists "barbers_select_active_or_admin" on public.barbers;
drop policy if exists "barbers_insert_admin" on public.barbers;
drop policy if exists "barbers_update_admin" on public.barbers;
drop policy if exists "barbers_delete_admin" on public.barbers;

-- business_hours

drop policy if exists "business_hours_select_active_or_admin" on public.business_hours;
drop policy if exists "business_hours_insert_admin" on public.business_hours;
drop policy if exists "business_hours_update_admin" on public.business_hours;
drop policy if exists "business_hours_delete_admin" on public.business_hours;

-- appointments

drop policy if exists "appointments_select_own_or_admin" on public.appointments;
drop policy if exists "appointments_insert_own_or_admin" on public.appointments;
drop policy if exists "appointments_update_admin" on public.appointments;
drop policy if exists "appointments_delete_admin" on public.appointments;

-- 4) Profiles policies
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_self_or_admin"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- 5) Services policies
create policy "services_select_active_or_admin"
on public.services
for select
to anon, authenticated
using (is_active = true or public.is_admin());

create policy "services_insert_admin"
on public.services
for insert
to authenticated
with check (public.is_admin());

create policy "services_update_admin"
on public.services
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "services_delete_admin"
on public.services
for delete
to authenticated
using (public.is_admin());

-- 6) Barbers policies
create policy "barbers_select_active_or_admin"
on public.barbers
for select
to anon, authenticated
using (is_active = true or public.is_admin());

create policy "barbers_insert_admin"
on public.barbers
for insert
to authenticated
with check (public.is_admin());

create policy "barbers_update_admin"
on public.barbers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "barbers_delete_admin"
on public.barbers
for delete
to authenticated
using (public.is_admin());

-- 7) Business hours policies
create policy "business_hours_select_active_or_admin"
on public.business_hours
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.barbers b
    where b.id = business_hours.barber_id
      and b.is_active = true
  )
  or public.is_admin()
);

create policy "business_hours_insert_admin"
on public.business_hours
for insert
to authenticated
with check (public.is_admin());

create policy "business_hours_update_admin"
on public.business_hours
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "business_hours_delete_admin"
on public.business_hours
for delete
to authenticated
using (public.is_admin());

-- 8) Appointments policies
create policy "appointments_select_own_or_admin"
on public.appointments
for select
to authenticated
using (client_id = auth.uid() or public.is_admin());

create policy "appointments_insert_own_or_admin"
on public.appointments
for insert
to authenticated
with check (client_id = auth.uid() or public.is_admin());

create policy "appointments_update_admin"
on public.appointments
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "appointments_delete_admin"
on public.appointments
for delete
to authenticated
using (public.is_admin());

-- 9) Booking conflict protection (active statuses only)
create unique index if not exists appointments_unique_active_slot
on public.appointments (barber_id, appointment_date, start_time)
where status in ('pending', 'confirmed', 'in_progress');

-- 10) Optional but recommended: status validation (if column is text)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_status_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_status_check
      check (status in ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));
  end if;
end
$$;

commit;
