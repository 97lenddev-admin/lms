-- Branch Managers review completed investigation work for loans awaiting approval.
-- Access is read-only and limited to investigations attached to Active loans.

grant select on table public.loan_credit_investigations to authenticated;

alter table public.loan_credit_investigations enable row level security;

drop policy if exists "Branch managers read active loan investigations"
  on public.loan_credit_investigations;

create policy "Branch managers read active loan investigations"
on public.loan_credit_investigations
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
  and exists (
    select 1
    from public.loans as loan
    where loan.id = loan_credit_investigations.loan_id
      and lower(loan.status) = 'active'
  )
);
