-- Add administrator-controlled premium display for published marketplace listings.
-- The default keeps every existing and future listing unfeatured.
-- The public view exposes only the new boolean; all existing row filters and RLS remain in force.

alter table public.listings
  add column if not exists is_featured boolean not null default false;

create or replace function private.guard_featured_listing_changes()
returns trigger
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if new.is_featured is distinct from old.is_featured
     and not (select public.is_conecta_admin()) then
    raise exception 'Only active Conecta administrators can change premium listing status.';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_featured_listing_changes()
  from public, anon, authenticated;

drop trigger if exists listings_guard_featured_change on public.listings;
create trigger listings_guard_featured_change
before update of is_featured on public.listings
for each row execute function private.guard_featured_listing_changes();

-- Preserve the existing SECURITY INVOKER view and append the new public display flag.
create or replace view public.public_listings
with (security_invoker = true)
as
select
  id,
  title,
  category,
  subcategory,
  island,
  municipality,
  price,
  description,
  whatsapp,
  phone,
  image_url,
  listing_status,
  created_at,
  is_featured
from public.listings
where listing_status = 'published';

grant select on public.public_listings to anon, authenticated;
