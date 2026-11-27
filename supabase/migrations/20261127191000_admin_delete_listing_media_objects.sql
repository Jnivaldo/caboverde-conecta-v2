drop policy if exists "admin delete listing media objects" on storage.objects;
create policy "admin delete listing media objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'listing-media'
  and (select public.is_conecta_admin())
);