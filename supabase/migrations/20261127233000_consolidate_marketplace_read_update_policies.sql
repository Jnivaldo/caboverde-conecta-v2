-- Consolidate authenticated read/update RLS policies while preserving public anon access.
-- Authenticated users retain owner/participant/admin access and can read approved public rows.
-- Anonymous users retain access only to published/approved, active, non-expired public rows.

alter policy "public read published listings"
on public.listings to anon;
alter policy "owner read own listings"
on public.listings
using (
  owner_id = (select auth.uid())
  or (select public.is_conecta_admin())
  or listing_status = 'published'
);

alter policy procurement_requests_public_approved_select
on public.procurement_requests to anon;
alter policy procurement_requests_owner_select
on public.procurement_requests
using (
  requester_id = (select auth.uid())
  or (select public.is_conecta_admin())
  or (
    moderation_status = 'approved'
    and status in ('active','negotiating')
    and expires_at > now()
  )
);

alter policy procurement_offers_public_approved_select
on public.procurement_offers to anon;
alter policy procurement_offers_participant_select
on public.procurement_offers
using (
  supplier_id = (select auth.uid())
  or (select public.is_conecta_admin())
  or exists (
    select 1 from public.procurement_requests r
    where r.id = procurement_offers.request_id
      and r.requester_id = (select auth.uid())
  )
  or (
    moderation_status = 'approved'
    and exists (
      select 1 from public.procurement_requests r
      where r.id = procurement_offers.request_id
        and r.moderation_status = 'approved'
        and r.status in ('active','negotiating')
        and r.expires_at > now()
    )
  )
);

-- Combine admin and owner UPDATE permissions into one policy to avoid duplicate evaluation.
drop policy "admin update listings" on public.listings;
alter policy "owner update own pending listing"
on public.listings
using (
  (select public.is_conecta_admin())
  or (
    owner_id = (select auth.uid())
    and listing_status in ('pending','published','suspended')
  )
)
with check (
  (select public.is_conecta_admin())
  or (
    owner_id = (select auth.uid())
    and listing_status in ('pending','published','suspended')
    and payment_status in ('pending','confirmed','rejected')
  )
);
