grant select on table public.loan_co_makers to authenticated;

alter table public.loan_co_makers enable row level security;

drop policy if exists "Branch managers read loan co-makers"
  on public.loan_co_makers;

create policy "Branch managers read loan co-makers"
on public.loan_co_makers
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
    where loan.id = loan_co_makers.loan_id
  )
);
