-- Branch Managers may reject active loans and record the decision details.
grant update (status, reason_for_rejection, rejection_additional_details)
  on table public.loans
  to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Branch managers reject active loan applications"
  on public.loans;

create policy "Branch managers reject active loan applications"
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
  lower(status) = 'rejected'
  and nullif(btrim(reason_for_rejection), '') is not null
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
);
