insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-media',
  'listing-media',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','image/avif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "listing_media_owner_upload" on storage.objects;
create policy "listing_media_owner_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "listing_media_owner_update" on storage.objects;
create policy "listing_media_owner_update"
on storage.objects for update to authenticated
using (bucket_id = 'listing-media' and owner_id = (select auth.uid()::text))
with check (bucket_id = 'listing-media' and owner_id = (select auth.uid()::text));

drop policy if exists "listing_media_owner_delete" on storage.objects;
create policy "listing_media_owner_delete"
on storage.objects for delete to authenticated
using (bucket_id = 'listing-media' and owner_id = (select auth.uid()::text));

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_sort_idx
  on public.listing_media (listing_id, sort_order, created_at);

alter table public.listing_media enable row level security;
revoke all on public.listing_media from anon, authenticated;
grant select on public.listing_media to anon, authenticated;
grant insert, update, delete on public.listing_media to authenticated;

drop policy if exists "listing_media_visible_for_public_or_owner" on public.listing_media;
create policy "listing_media_visible_for_public_or_owner"
on public.listing_media for select to anon, authenticated
using (
  exists (
    select 1 from public.public_listings pl
    where pl.id = listing_media.listing_id
  )
  or owner_id = (select auth.uid())
  or public.is_conecta_admin()
);

drop policy if exists "listing_media_owner_insert" on public.listing_media;
create policy "listing_media_owner_insert"
on public.listing_media for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.owner_id = (select auth.uid()))
);

drop policy if exists "listing_media_owner_update" on public.listing_media;
create policy "listing_media_owner_update"
on public.listing_media for update to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.owner_id = (select auth.uid()))
)
with check (owner_id = (select auth.uid()));

drop policy if exists "listing_media_owner_delete" on public.listing_media;
create policy "listing_media_owner_delete"
on public.listing_media for delete to authenticated
using (
  owner_id = (select auth.uid())
  and exists (select 1 from public.listings l where l.id = listing_media.listing_id and l.owner_id = (select auth.uid()))
);