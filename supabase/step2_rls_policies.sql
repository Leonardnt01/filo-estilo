-- Step 2: RLS + policies + booking integrity for FILO ESTILO
-- Execute this script in Supabase SQL Editor.

begin;

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

create or replace function public.can_manage_branch(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.memberships sm
      where sm.user_id = auth.uid()
        and sm.branch_id = target_branch_id
        and sm.is_active = true
        and sm.role in ('owner', 'admin')
    );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.can_manage_branch(uuid) from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_manage_branch(uuid) to authenticated;

alter table if exists public.profiles enable row level security;
alter table if exists public.services enable row level security;
alter table if exists public.barbers enable row level security;
alter table if exists public.business_hours enable row level security;
alter table if exists public.appointments enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

drop policy if exists "services_select_active_or_admin" on public.services;
drop policy if exists "services_insert_admin" on public.services;
drop policy if exists "services_update_admin" on public.services;
drop policy if exists "services_delete_admin" on public.services;
drop policy if exists "Admins can manage services" on public.services;
drop policy if exists "Anyone can view active services" on public.services;
drop policy if exists "services_delete_staff" on public.services;
drop policy if exists "services_insert_staff" on public.services;
drop policy if exists "services_select_active_or_staff" on public.services;
drop policy if exists "services_update_staff" on public.services;

drop policy if exists "barbers_select_active_or_admin" on public.barbers;
drop policy if exists "barbers_insert_admin" on public.barbers;
drop policy if exists "barbers_update_admin" on public.barbers;
drop policy if exists "barbers_delete_admin" on public.barbers;
drop policy if exists "Admins can manage barbers" on public.barbers;
drop policy if exists "Anyone can view active barbers" on public.barbers;
drop policy if exists "barbers_delete_staff" on public.barbers;
drop policy if exists "barbers_insert_staff" on public.barbers;
drop policy if exists "barbers_select_active_or_staff" on public.barbers;
drop policy if exists "barbers_update_staff" on public.barbers;

drop policy if exists "business_hours_select_active_or_admin" on public.business_hours;
drop policy if exists "business_hours_insert_admin" on public.business_hours;
drop policy if exists "business_hours_update_admin" on public.business_hours;
drop policy if exists "business_hours_delete_admin" on public.business_hours;
drop policy if exists "Admins can manage business hours" on public.business_hours;
drop policy if exists "Anyone can view active business hours" on public.business_hours;
drop policy if exists "business_hours_delete_staff" on public.business_hours;
drop policy if exists "business_hours_insert_staff" on public.business_hours;
drop policy if exists "business_hours_select_active_or_staff" on public.business_hours;
drop policy if exists "business_hours_update_staff" on public.business_hours;

drop policy if exists "appointments_select_own_or_admin" on public.appointments;
drop policy if exists "appointments_insert_own_or_admin" on public.appointments;
drop policy if exists "appointments_update_admin" on public.appointments;
drop policy if exists "appointments_delete_admin" on public.appointments;
drop policy if exists "Admins can manage all appointments" on public.appointments;
drop policy if exists "appointments_delete_staff" on public.appointments;
drop policy if exists "appointments_insert_client_or_staff" on public.appointments;
drop policy if exists "appointments_select_own_or_staff" on public.appointments;
drop policy if exists "appointments_update_staff" on public.appointments;
drop policy if exists "Users can create own appointments" on public.appointments;
drop policy if exists "Users can update own appointments" on public.appointments;
drop policy if exists "Users can view own appointments" on public.appointments;

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

create policy "services_select_active_or_admin"
on public.services
for select
to anon, authenticated
using (is_active = true or public.can_manage_branch(branch_id));

create policy "services_insert_admin"
on public.services
for insert
to authenticated
with check (public.can_manage_branch(branch_id));

create policy "services_update_admin"
on public.services
for update
to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "services_delete_admin"
on public.services
for delete
to authenticated
using (public.can_manage_branch(branch_id));

create policy "barbers_select_active_or_admin"
on public.barbers
for select
to anon, authenticated
using (is_active = true or public.can_manage_branch(branch_id));

create policy "barbers_insert_admin"
on public.barbers
for insert
to authenticated
with check (public.can_manage_branch(branch_id));

create policy "barbers_update_admin"
on public.barbers
for update
to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "barbers_delete_admin"
on public.barbers
for delete
to authenticated
using (public.can_manage_branch(branch_id));

create policy "business_hours_select_active_or_admin"
on public.business_hours
for select
to anon, authenticated
using (
  (
    is_active = true
    and exists (
      select 1
      from public.barbers b
      where b.id = business_hours.barber_id
        and b.is_active = true
    )
  )
  or public.can_manage_branch(branch_id)
);

create policy "business_hours_insert_admin"
on public.business_hours
for insert
to authenticated
with check (public.can_manage_branch(branch_id));

create policy "business_hours_update_admin"
on public.business_hours
for update
to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "business_hours_delete_admin"
on public.business_hours
for delete
to authenticated
using (public.can_manage_branch(branch_id));

create policy "appointments_select_own_or_admin"
on public.appointments
for select
to authenticated
using (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

create policy "appointments_insert_own_or_admin"
on public.appointments
for insert
to authenticated
with check (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

create policy "appointments_update_admin"
on public.appointments
for update
to authenticated
using (public.can_manage_branch(branch_id))
with check (public.can_manage_branch(branch_id));

create policy "appointments_delete_admin"
on public.appointments
for delete
to authenticated
using (public.can_manage_branch(branch_id));

create unique index if not exists appointments_unique_active_slot
on public.appointments (barber_id, appointment_date, start_time)
where status in ('pending', 'confirmed', 'in_progress');

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
