-- Credit Analysts need to see co-makers linked to the loans on their dashboard.
-- The application still verifies the user's role on every page and Server Action;
-- this policy applies the same authorization rule inside Postgres.

grant select on table public.loan_co_makers to authenticated;

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
