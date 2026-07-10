-- Step 4: No-show prevention + waitlist recovery for FILO ESTILO
-- Execute this script in Supabase SQL Editor after step1 and step2.

begin;

alter table if exists public.appointments
  add column if not exists attendance_status text not null default 'pending',
  add column if not exists attendance_confirmed_at timestamptz null,
  add column if not exists last_reminder_at timestamptz null,
  add column if not exists reminder_count integer not null default 0,
  add column if not exists release_reason text null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_attendance_status_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_attendance_status_check
      check (attendance_status in ('pending', 'confirmed', 'declined', 'expired'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'appointments_release_reason_check'
      and conrelid = 'public.appointments'::regclass
  ) then
    alter table public.appointments
      add constraint appointments_release_reason_check
      check (
        release_reason is null
        or release_reason in ('client_declined', 'client_cancelled', 'admin_cancelled', 'no_show')
      );
  end if;
end
$$;

create index if not exists appointments_attendance_status_idx
  on public.appointments (attendance_status);

create index if not exists appointments_release_reason_idx
  on public.appointments (release_reason)
  where release_reason is not null;

create table if not exists public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  barber_id uuid null references public.barbers(id) on delete set null,
  desired_date date not null,
  desired_start_from time null,
  desired_start_to time null,
  status text not null default 'active',
  source_appointment_id uuid null references public.appointments(id) on delete set null,
  promoted_appointment_id uuid null references public.appointments(id) on delete set null,
  offer_expires_at timestamptz null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'waitlist_entries_status_check'
      and conrelid = 'public.waitlist_entries'::regclass
  ) then
    alter table public.waitlist_entries
      add constraint waitlist_entries_status_check
      check (status in ('active', 'offered', 'accepted', 'rejected', 'expired', 'fulfilled', 'cancelled'));
  end if;
end
$$;

create index if not exists waitlist_entries_client_idx
  on public.waitlist_entries (client_id);

create index if not exists waitlist_entries_branch_status_date_idx
  on public.waitlist_entries (branch_id, status, desired_date);

create index if not exists waitlist_entries_matching_idx
  on public.waitlist_entries (branch_id, service_id, status, desired_date)
  where status = 'active';

create index if not exists waitlist_entries_source_appt_idx
  on public.waitlist_entries (source_appointment_id)
  where source_appointment_id is not null;

alter table if exists public.waitlist_entries enable row level security;

drop policy if exists "waitlist_select_own_or_branch_admin" on public.waitlist_entries;
drop policy if exists "waitlist_insert_client_self" on public.waitlist_entries;
drop policy if exists "waitlist_update_own_or_branch_admin" on public.waitlist_entries;
drop policy if exists "waitlist_delete_own_or_branch_admin" on public.waitlist_entries;

create policy "waitlist_select_own_or_branch_admin"
on public.waitlist_entries
for select
to authenticated
using (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

create policy "waitlist_insert_client_self"
on public.waitlist_entries
for insert
to authenticated
with check (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

create policy "waitlist_update_own_or_branch_admin"
on public.waitlist_entries
for update
to authenticated
using (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
)
with check (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

create policy "waitlist_delete_own_or_branch_admin"
on public.waitlist_entries
for delete
to authenticated
using (
  client_id = auth.uid()
  or public.can_manage_branch(branch_id)
);

commit;
