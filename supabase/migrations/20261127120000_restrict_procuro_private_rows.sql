-- Restrict private request/offer rows to owners, participants and admins.
-- Public discovery goes through narrowly projected views only.
drop policy if exists procurement_requests_public_select on public.procurement_requests;
create policy procurement_requests_public_select
  on public.procurement_requests for select to anon
  using (
    moderation_status = 'approved'
    and status in ('active', 'negotiating')
    and expires_at > now()
  );

drop policy if exists procurement_offers_public_select on public.procurement_offers;
create policy procurement_offers_public_select
  on public.procurement_offers for select to anon
  using (
    moderation_status = 'approved'
    and exists (
      select 1 from public.procurement_requests r
      where r.id = request_id
        and r.moderation_status = 'approved'
        and r.status in ('active', 'negotiating')
        and r.expires_at > now()
    )
  );

-- These views intentionally execute with the view owner's table privileges.
-- Their projections expose only approved public fields; requester WhatsApp is
-- returned by a helper that enforces explicit consent.
create or replace view public.public_procurement_requests
with (security_barrier = true)
as
select
  r.id, r.title, r.category, r.island, r.municipality, r.description,
  r.budget,
  private.public_requester_whatsapp(r.id) as requester_whatsapp,
  (r.show_whatsapp and private.public_requester_whatsapp(r.id) is not null) as show_whatsapp,
  r.status, r.expires_at, r.created_at, r.updated_at
from public.procurement_requests r
where r.moderation_status = 'approved'
  and r.status in ('active', 'negotiating')
  and r.expires_at > now();

create or replace view public.public_procurement_offers
with (security_barrier = true)
as
select
  o.id, o.request_id, o.business_name, o.model, o.price_cve, o.condition,
  o.description, o.photo_url, o.supplier_whatsapp, o.created_at
from public.procurement_offers o
join public.procurement_requests r on r.id = o.request_id
where o.moderation_status = 'approved'
  and r.moderation_status = 'approved'
  and r.status in ('active', 'negotiating')
  and r.expires_at > now();

revoke all on public.procurement_requests from anon;
revoke all on public.procurement_offers from anon;
grant select on public.public_procurement_requests to anon, authenticated;
grant select on public.public_procurement_offers to anon, authenticated;
