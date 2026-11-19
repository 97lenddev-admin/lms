drop policy if exists "Branch managers read application documents"
  on storage.objects;

create policy "Branch managers read application documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'loan-application-documents'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Branch Manager'
  )
  and exists (
    select 1
    from public.loans as loan
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(loan.supporting_documents) = 'array'
          then loan.supporting_documents
        when jsonb_typeof(loan.supporting_documents) = 'object'
          and jsonb_typeof(loan.supporting_documents -> 'files') = 'array'
          then loan.supporting_documents -> 'files'
        else '[]'::jsonb
      end
    ) as document
    where coalesce(document ->> 'kind', 'file') = 'file'
      and document ->> 'path' = storage.objects.name
  )
);
