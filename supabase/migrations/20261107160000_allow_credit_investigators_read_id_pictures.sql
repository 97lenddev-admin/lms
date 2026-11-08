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
        where picture ->> 'kind' = 'applicant_2x2'
          and picture ->> 'path' = storage.objects.name
      )
    )
  )
);
