-- Step 3: Performance indexes for public catalog and booking availability
-- Goal:
-- 1) Speed up filtered reads used by booking availability
-- 2) Keep indexes small with partial predicates where queries always filter active rows/statuses
--
-- Run in Supabase SQL Editor after step1/step2.

begin;

create index if not exists services_active_branch_lookup_idx
  on public.services (branch_id, id)
  where is_active = true;

create index if not exists barbers_active_branch_lookup_idx
  on public.barbers (branch_id, id)
  where is_active = true;

create index if not exists business_hours_active_lookup_idx
  on public.business_hours (branch_id, barber_id, day_of_week)
  where is_active = true;

create index if not exists appointments_active_availability_lookup_idx
  on public.appointments (branch_id, barber_id, appointment_date, appointment_time)
  where status in ('pending', 'confirmed', 'in_progress');

create index if not exists appointments_profile_history_idx
  on public.appointments (profile_id, appointment_date desc, appointment_time desc);

commit;

-- Suggested validation:
-- explain analyze
-- select id, appointment_time
-- from public.appointments
-- where branch_id = '00000000-0000-0000-0000-000000000000'
--   and barber_id = '00000000-0000-0000-0000-000000000000'
--   and appointment_date = '2026-01-01'
--   and status in ('pending', 'confirmed', 'in_progress');
