grant select on table public.loan_co_makers to authenticated;

alter table public.loan_co_makers enable row level security;

drop policy if exists "Credit investigators read loan co-makers"
  on public.loan_co_makers;

create policy "Credit investigators read loan co-makers"
on public.loan_co_makers
for select
to authenticated
using (
  exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Investigator'
  )
  and exists (
    select 1
    from public.loans as loan
    where loan.id = loan_co_makers.loan_id
      and (
        loan.claim_status = 'open'
        or (
          loan.claim_status = 'claimed'
          and loan.claimed_by = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Credit investigators read application documents"
  on storage.objects;

create policy "Credit investigators read application documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'loan-application-documents'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Investigator'
  )
  and exists (
    select 1
    from public.loans as loan
    where (
      loan.claim_status = 'open'
      or (
        loan.claim_status = 'claimed'
        and loan.claimed_by = (select auth.uid())
      )
    )
    and (
      exists (
        select 1
        from jsonb_array_elements(
          coalesce(loan.supporting_documents, '[]'::jsonb)
        ) as document
        where document ->> 'kind' = 'file'
          and document ->> 'path' = storage.objects.name
      )
      or exists (
        select 1
        from jsonb_array_elements(
          case
            when coalesce(loan.id_pictures, '') ~ '^\s*\['
              then loan.id_pictures::jsonb
            else '[]'::jsonb
          end
        ) as picture
        where picture ->> 'kind' in ('applicant_2x2', 'co_maker_2x2')
          and picture ->> 'path' = storage.objects.name
      )
    )
  )
);
