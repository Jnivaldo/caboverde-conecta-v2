-- Procuro & Ofereço persistence foundation
-- Prepared on an isolated feature branch. NOT applied to Supabase.
-- Requests are free; only supplier listings in the main marketplace are monetized.

create table if not exists public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 5 and 120),
  category text not null check (char_length(btrim(category)) between 2 and 80),
  island text not null check (char_length(btrim(island)) between 2 and 60),
  municipality text not null check (char_length(btrim(municipality)) between 2 and 80),
  description text not null check (char_length(btrim(description)) between 10 and 2000),
  budget text check (budget is null or char_length(budget) <= 80),
  requester_whatsapp text,
  show_whatsapp boolean not null default false,
  status text not null default 'active'
    check (status in ('active', 'negotiating', 'completed')),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint requester_whatsapp_consent check (
    show_whatsapp = false or nullif(btrim(requester_whatsapp), '') is not null
  )
);

create table if not exists public.procurement_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  supplier_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 2 and 120),
  model text not null check (char_length(btrim(model)) between 2 and 160),
  price_cve numeric(12,2) not null check (price_cve > 0),
  condition text not null check (condition in ('new', 'used', 'refurbished')),
  description text not null check (char_length(btrim(description)) between 5 and 2000),
  photo_url text check (
    photo_url is null or
    (char_length(photo_url) <= 2048 and photo_url ~* '^https://')
  ),
  supplier_whatsapp text not null check (char_length(regexp_replace(supplier_whatsapp, '[^0-9]', '', 'g')) between 7 and 15),
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, supplier_id)
);

create index if not exists procurement_requests_public_feed_idx
  on public.procurement_requests (created_at desc)
  where moderation_status = 'approved' and status in ('active', 'negotiating');
create index if not exists procurement_requests_owner_idx
  on public.procurement_requests (requester_id, created_at desc);
create index if not exists procurement_offers_request_idx
  on public.procurement_offers (request_id, created_at desc);
create index if not exists procurement_offers_supplier_idx
  on public.procurement_offers (supplier_id, created_at desc);

alter table public.procurement_requests enable row level security;
alter table public.procurement_offers enable row level security;

revoke all on public.procurement_requests from anon;
revoke all on public.procurement_offers from anon;
grant select, insert, update on public.procurement_requests to authenticated;
grant select, insert on public.procurement_offers to authenticated;

drop policy if exists procurement_requests_owner_select on public.procurement_requests;
create policy procurement_requests_owner_select
  on public.procurement_requests for select to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_conecta_admin()));

drop policy if exists procurement_requests_owner_insert on public.procurement_requests;
create policy procurement_requests_owner_insert
  on public.procurement_requests for insert to authenticated
  with check (
    requester_id = (select auth.uid())
    and moderation_status = 'pending'
    and status = 'active'
    and expires_at > now()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_state = 'active'
    )
  );

drop policy if exists procurement_requests_owner_update on public.procurement_requests;
create policy procurement_requests_owner_update
  on public.procurement_requests for update to authenticated
  using (requester_id = (select auth.uid()) or (select public.is_conecta_admin()))
  with check (requester_id = (select auth.uid()) or (select public.is_conecta_admin()));

drop policy if exists procurement_offers_participant_select on public.procurement_offers;
create policy procurement_offers_participant_select
  on public.procurement_offers for select to authenticated
  using (
    supplier_id = (select auth.uid())
    or (select public.is_conecta_admin())
    or exists (
      select 1 from public.procurement_requests r
      where r.id = request_id and r.requester_id = (select auth.uid())
    )
  );

drop policy if exists procurement_offers_supplier_insert on public.procurement_offers;
create policy procurement_offers_supplier_insert
  on public.procurement_offers for insert to authenticated
  with check (
    supplier_id = (select auth.uid())
    and moderation_status = 'pending'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.account_state = 'active'
    )
    and exists (
      select 1 from public.procurement_requests r
      where r.id = request_id
        and r.requester_id <> (select auth.uid())
        and r.moderation_status = 'approved'
        and r.status in ('active', 'negotiating')
        and r.expires_at > now()
    )
  );

create or replace function public.procurement_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.procurement_guard_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select public.is_conecta_admin()) then
    return new;
  end if;

  if old.requester_id is distinct from new.requester_id
    or old.moderation_status is distinct from new.moderation_status
    or old.expires_at is distinct from new.expires_at
    or old.created_at is distinct from new.created_at
  then
    raise exception 'REQUEST_PROTECTED_FIELDS';
  end if;

  if new.status not in ('active', 'negotiating', 'completed') then
    raise exception 'INVALID_REQUEST_STATUS';
  end if;

  return new;
end;
$$;

drop trigger if exists procurement_requests_updated_at on public.procurement_requests;
create trigger procurement_requests_updated_at
  before update on public.procurement_requests
  for each row execute function public.procurement_set_updated_at();

drop trigger if exists procurement_offers_updated_at on public.procurement_offers;
create trigger procurement_offers_updated_at
  before update on public.procurement_offers
  for each row execute function public.procurement_set_updated_at();

drop trigger if exists procurement_requests_guard_update on public.procurement_requests;
create trigger procurement_requests_guard_update
  before update on public.procurement_requests
  for each row execute function public.procurement_guard_request_update();

-- Safe public projections: the requester's number is NULL unless explicit consent was given.
-- Base tables remain unavailable to anonymous users.
create or replace view public.public_procurement_requests
with (security_barrier = true)
as
select
  r.id, r.title, r.category, r.island, r.municipality, r.description,
  r.budget,
  case when r.show_whatsapp then r.requester_whatsapp else null end as requester_whatsapp,
  r.show_whatsapp, r.status, r.expires_at, r.created_at, r.updated_at
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

grant select on public.public_procurement_requests to anon, authenticated;
grant select on public.public_procurement_offers to anon, authenticated;

comment on table public.procurement_requests is
  'Free customer requests in Procuro & Ofereço. Expire after 30 days; moderation required before public display.';
comment on table public.procurement_offers is
  'Supplier responses to free customer requests. Offers do not create paid marketplace listings.';
