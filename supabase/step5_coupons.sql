-- Step 5: Client reward coupons ("Descuentos del Día") for FILO ESTILO
-- Execute this script in the Supabase SQL Editor after step1..step4.
-- Clients unlock low-cost perk coupons (free hair wash, drink, etc.) once they
-- reach a number of completed appointments. Coupons are redeemed during booking
-- and appear as S/ 0 line items in the payment summary.

begin;

create table if not exists public.user_coupons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  promo_key text not null,
  title text not null,
  description text null,
  status text not null default 'active',
  expires_at timestamptz not null,
  used_at timestamptz null,
  appointment_id uuid null references public.appointments(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_coupons_status_check'
      and conrelid = 'public.user_coupons'::regclass
  ) then
    alter table public.user_coupons
      add constraint user_coupons_status_check
      check (status in ('active', 'used', 'expired'));
  end if;
end
$$;

create index if not exists user_coupons_client_status_idx
  on public.user_coupons (client_id, status);

create index if not exists user_coupons_client_promo_idx
  on public.user_coupons (client_id, promo_key);

alter table if exists public.user_coupons enable row level security;

drop policy if exists "user_coupons_select_own" on public.user_coupons;
drop policy if exists "user_coupons_insert_own" on public.user_coupons;
drop policy if exists "user_coupons_update_own" on public.user_coupons;

create policy "user_coupons_select_own"
on public.user_coupons
for select
to authenticated
using (client_id = auth.uid());

create policy "user_coupons_insert_own"
on public.user_coupons
for insert
to authenticated
with check (client_id = auth.uid());

create policy "user_coupons_update_own"
on public.user_coupons
for update
to authenticated
using (client_id = auth.uid())
with check (client_id = auth.uid());

commit;
