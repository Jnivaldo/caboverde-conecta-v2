create or replace function private.prevent_published_listing_without_images()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_listing_status text;
  v_image_count bigint;
begin
  select l.listing_status
    into v_listing_status
  from public.listings l
  where l.id = old.listing_id;

  -- The listing itself may have been deleted in the same transaction.
  if not found or v_listing_status <> 'published' then
    return null;
  end if;

  select count(*)
    into v_image_count
  from public.listing_media m
  where m.listing_id = old.listing_id
    and m.media_type = 'image';

  if v_image_count = 0 then
    raise exception 'Um anúncio publicado deve manter pelo menos uma fotografia.'
      using errcode = '23514',
            constraint = 'published_listing_requires_image';
  end if;

  return null;
end;
$function$;

revoke all on function private.prevent_published_listing_without_images() from public, anon, authenticated;

drop trigger if exists listing_media_preserve_published_image on public.listing_media;

create constraint trigger listing_media_preserve_published_image
after delete on public.listing_media
deferrable initially deferred
for each row
execute function private.prevent_published_listing_without_images();
