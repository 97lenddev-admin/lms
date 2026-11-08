grant update (id_pictures) on table public.loans to authenticated;

drop policy if exists "Credit analysts update pending loan ID pictures" on public.loans;

create policy "Credit analysts update pending loan ID pictures"
on public.loans
for update
to authenticated
using (
  status = 'pending'
  and exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
)
with check (
  status = 'pending'
  and exists (
    select 1
    from public.user_profiles profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);
