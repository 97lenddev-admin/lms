-- Private supporting documents uploaded by credit analysts.
-- Object paths are scoped as: <credit_analyst_id>/<generated-file-name>.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'loan-application-documents',
  'loan-application-documents',
  false,
  5242880,
  array['application/pdf', 'image/png', 'image/jpeg']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Credit analysts upload application documents"
  on storage.objects;

create policy "Credit analysts upload application documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'loan-application-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);

drop policy if exists "Credit analysts read application documents"
  on storage.objects;

create policy "Credit analysts read application documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'loan-application-documents'
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);

drop policy if exists "Credit analysts delete own application documents"
  on storage.objects;

create policy "Credit analysts delete own application documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'loan-application-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.user_profiles as profile
    where profile.id = (select auth.uid())
      and profile.roles = 'Credit Analyst'
  )
);
