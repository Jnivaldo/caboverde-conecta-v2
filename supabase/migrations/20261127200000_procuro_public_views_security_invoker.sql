-- Make Procuro & Ofereço public views honor caller privileges and RLS.
-- Only approved, active, non-expired requests/offers are visible publicly.
-- Anonymous users receive column-level access only; private contact columns stay protected.

alter view public.public_procurement_requests
  set (security_invoker = true, security_barrier = true);
alter view public.public_procurement_offers
  set (security_invoker = true, security_barrier = true);

grant usage on schema private to anon, authenticated;
grant execute on function private.public_requester_whatsapp(uuid) to anon, authenticated;

grant select (id, title, category, island, municipality, description, budget,
  show_whatsapp, status, moderation_status, expires_at, created_at, updated_at)
on table public.procurement_requests to anon;

grant select (id, request_id, business_name, model, price_cve, condition,
  description, photo_url, supplier_whatsapp, moderation_status, created_at)
on table public.procurement_offers to anon;

drop policy if exists procurement_requests_public_approved_select
  on public.procurement_requests;
create policy procurement_requests_public_approved_select
  on public.procurement_requests
  for select to anon, authenticated
  using (
    moderation_status = 'approved'
    and status in ('active', 'negotiating')
    and expires_at > now()
  );

drop policy if exists procurement_offers_public_approved_select
  on public.procurement_offers;
create policy procurement_offers_public_approved_select
  on public.procurement_offers
  for select to anon, authenticated
  using (
    moderation_status = 'approved'
    and exists (
      select 1
      from public.procurement_requests r
      where r.id = procurement_offers.request_id
        and r.moderation_status = 'approved'
        and r.status in ('active', 'negotiating')
        and r.expires_at > now()
    )
  );
