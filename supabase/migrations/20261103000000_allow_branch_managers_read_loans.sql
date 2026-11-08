-- Branch Managers need the loan master list for review and reporting.
-- This policy grants read-only access; no INSERT, UPDATE, or DELETE access is added.

grant select on table public.loans to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Branch managers read loan applications"
  on public.loans;

create policy "Branch managers read loan applications"
on public.loans
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
);
