-- Secure public Procuro & Ofereço projections with invoker views and explicit RLS.
create or replace function private.public_requester_whatsapp(p_request_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select r.requester_whatsapp
  from public.procurement_requests r
  where r.id = p_request_id
    and r.show_whatsapp = true
    and r.moderation_status = 'approved'
    and r.status in ('active', 'negotiating')
    and r.expires_at > now()
  limit 1;
$function$;

revoke all on function private.public_requester_whatsapp(uuid) from public;
grant execute on function private.public_requester_whatsapp(uuid) to anon, authenticated;

drop policy if exists procurement_requests_public_select on public.procurement_requests;
create policy procurement_requests_public_select
  on public.procurement_requests for select to anon, authenticated
  using (
    moderation_status = 'approved'
    and status in ('active', 'negotiating')
    and expires_at > now()
  );

drop policy if exists procurement_offers_public_select on public.procurement_offers;
create policy procurement_offers_public_select
  on public.procurement_offers for select to anon, authenticated
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

revoke all on public.procurement_requests from anon;
grant select (id, title, category, island, municipality, description, budget, show_whatsapp, status, expires_at, created_at, updated_at)
  on public.procurement_requests to anon;
revoke all on public.procurement_offers from anon;
grant select (id, request_id, business_name, model, price_cve, condition, description, photo_url, supplier_whatsapp, created_at)
  on public.procurement_offers to anon;

create or replace view public.public_procurement_requests
with (security_invoker = true)
as
select
  r.id, r.title, r.category, r.island, r.municipality, r.description,
  r.budget,
  private.public_requester_whatsapp(r.id) as requester_whatsapp,
  r.show_whatsapp, r.status, r.expires_at, r.created_at, r.updated_at
from public.procurement_requests r
where r.moderation_status = 'approved'
  and r.status in ('active', 'negotiating')
  and r.expires_at > now();

create or replace view public.public_procurement_offers
with (security_invoker = true)
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
