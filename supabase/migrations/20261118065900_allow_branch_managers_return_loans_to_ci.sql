-- Branch Managers may return active loans to the Credit Investigator with
-- required revision instructions.
grant update (status, revision_details)
  on table public.loans
  to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Branch managers return active loan applications to CI"
  on public.loans;

create policy "Branch managers return active loan applications to CI"
on public.loans
for update
to authenticated
using (
  lower(status) = 'active'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
)
with check (
  lower(status) = 'pending'
  and nullif(btrim(revision_details), '') is not null
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
);
