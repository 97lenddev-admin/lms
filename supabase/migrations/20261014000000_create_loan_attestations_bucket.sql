-- Private bucket used by the voluntary surrender signed-attestation upload.
-- Object paths are scoped as: <investigation_id>/<generated-file-name>.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'loan-attestations',
  'loan-attestations',
  false,
  5242880,
  array['image/png', 'image/jpeg']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Investigators upload own loan attestations"
  on storage.objects;

create policy "Investigators upload own loan attestations"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'loan-attestations'
  and exists (
    select 1
    from public.loan_credit_investigations as investigation
    where investigation.id::text = (storage.foldername(name))[1]
      and investigation.credit_investigator_id = (select auth.uid())
  )
);

drop policy if exists "Investigators read own loan attestations"
  on storage.objects;

create policy "Investigators read own loan attestations"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'loan-attestations'
  and exists (
    select 1
    from public.loan_credit_investigations as investigation
    where investigation.id::text = (storage.foldername(name))[1]
      and investigation.credit_investigator_id = (select auth.uid())
  )
);

drop policy if exists "Investigators delete own loan attestations"
  on storage.objects;

create policy "Investigators delete own loan attestations"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'loan-attestations'
  and exists (
    select 1
    from public.loan_credit_investigations as investigation
    where investigation.id::text = (storage.foldername(name))[1]
      and investigation.credit_investigator_id = (select auth.uid())
  )
);
