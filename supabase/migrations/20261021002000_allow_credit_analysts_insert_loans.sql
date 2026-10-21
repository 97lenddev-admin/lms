-- Credit Analysts create loan applications through the authenticated app.
-- Existing read policies remain unchanged; this only grants and authorizes inserts.

grant select, insert on table public.loans to authenticated;

alter table public.loans enable row level security;

drop policy if exists "Credit analysts create loan applications"
  on public.loans;

create policy "Credit analysts create loan applications"
on public.loans
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
