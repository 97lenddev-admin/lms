-- PostgREST applies SELECT policies when an INSERT requests the created row.
-- Credit Analysts also need this policy to populate their submissions dashboard.

grant select on table public.loans to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Credit analysts read loan applications"
  on public.loans;

create policy "Credit analysts read loan applications"
on public.loans
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
