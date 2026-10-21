-- Credit Analysts may view and add a co-maker through the authenticated application.
-- No UPDATE or DELETE grant/policy is added, so saved co-makers remain read-only.

grant select, insert on table public.loan_co_makers to authenticated;

alter table public.loan_co_makers enable row level security;

drop policy if exists "Credit analysts read loan co-makers"
  on public.loan_co_makers;

create policy "Credit analysts read loan co-makers"
on public.loan_co_makers
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);

drop policy if exists "Credit analysts add loan co-makers"
  on public.loan_co_makers;

create policy "Credit analysts add loan co-makers"
on public.loan_co_makers
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);
