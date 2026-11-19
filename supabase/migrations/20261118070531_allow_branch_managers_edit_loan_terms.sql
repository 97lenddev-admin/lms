-- Branch Managers may revise the amount and term selected from the Advanced
-- Filter edit screen and record the reason for the change.
grant update (loan_amount, term, reason_for_editing)
  on table public.loans
  to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Branch managers edit loan amount and term"
  on public.loans;

create policy "Branch managers edit loan amount and term"
on public.loans
for update
to authenticated
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
)
with check (
  loan_amount > 0
  and term > 0
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
);
