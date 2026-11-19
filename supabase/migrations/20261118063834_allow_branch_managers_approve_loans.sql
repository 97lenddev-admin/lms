-- Branch Managers may make the final decision on active loan applications.
-- The application only writes these two decision fields.
grant update (status, reason_for_approving)
  on table public.loans
  to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Branch managers approve active loan applications"
  on public.loans;

create policy "Branch managers approve active loan applications"
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
  lower(status) = 'approved'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
);
