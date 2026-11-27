alter table public.listings
  add column if not exists featured_until timestamptz;

create table if not exists public.listing_featured_promotions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  amount_cve integer not null default 2500 check (amount_cve = 2500),
  duration_days integer not null default 30 check (duration_days = 30),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','active','rejected','expired','cancelled')),
  payment_reference text,
  admin_note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  featured_until timestamptz,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz
);

create index if not exists listing_featured_promotions_owner_created_idx
  on public.listing_featured_promotions(owner_id, created_at desc);
create index if not exists listing_featured_promotions_status_created_idx
  on public.listing_featured_promotions(status, created_at desc);
create unique index if not exists listing_featured_promotions_one_open_per_listing
  on public.listing_featured_promotions(listing_id)
  where status in ('pending_payment','active');

alter table public.listing_featured_promotions enable row level security;
drop policy if exists "Owners and admins read featured promotion requests" on public.listing_featured_promotions;
create policy "Owners and admins read featured promotion requests"
  on public.listing_featured_promotions for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_conecta_admin()));

create or replace function public.request_listing_featured_promotion(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_request_id uuid;
begin
  if v_user_id is null then raise exception 'É necessário iniciar sessão.'; end if;
  if not exists (
    select 1 from public.listings
    where id = p_listing_id and owner_id = v_user_id and listing_status = 'published'
  ) then
    raise exception 'Só pode solicitar destaque para um anúncio seu que esteja publicado.';
  end if;
  if exists (
    select 1 from public.listings
    where id = p_listing_id and is_featured = true and featured_until > now()
  ) then
    raise exception 'Este anúncio já tem um destaque ativo.';
  end if;
  insert into public.listing_featured_promotions (listing_id, owner_id, amount_cve, duration_days)
  values (p_listing_id, v_user_id, 2500, 30)
  returning id into v_request_id;
  return v_request_id;
exception when unique_violation then
  raise exception 'Já existe um pedido de destaque pendente ou ativo para este anúncio.';
end;
$$;

create or replace function public.review_listing_featured_promotion(
  p_promotion_id uuid, p_decision text,
  p_payment_reference text default null, p_admin_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_promotion public.listing_featured_promotions%rowtype;
  v_until timestamptz;
begin
  if not coalesce(public.is_conecta_admin(), false) then
    raise exception 'Apenas administradores podem rever pagamentos de destaque.';
  end if;
  if p_decision not in ('confirm','reject') then raise exception 'Decisão inválida.'; end if;
  select * into v_promotion from public.listing_featured_promotions
  where id = p_promotion_id for update;
  if not found or v_promotion.status <> 'pending_payment' then
    raise exception 'Pedido não encontrado ou já foi analisado.';
  end if;
  if p_decision = 'confirm' then
    if not exists (select 1 from public.listings where id = v_promotion.listing_id and listing_status = 'published') then
      raise exception 'O anúncio já não está publicado; não é possível ativar o destaque.';
    end if;
    v_until := now() + interval '30 days';
    update public.listing_featured_promotions set
      status = 'active', paid_at = now(), featured_until = v_until,
      payment_reference = nullif(left(trim(coalesce(p_payment_reference,'')),200), ''),
      admin_note = nullif(left(trim(coalesce(p_admin_note,'')),1000), ''),
      reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_promotion_id;
    update public.listings set is_featured = true, featured_until = v_until, updated_at = now()
    where id = v_promotion.listing_id;
  else
    update public.listing_featured_promotions set
      status = 'rejected',
      payment_reference = nullif(left(trim(coalesce(p_payment_reference,'')),200), ''),
      admin_note = nullif(left(trim(coalesce(p_admin_note,'')),1000), ''),
      reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_promotion_id;
  end if;
  return true;
end;
$$;

revoke all on function public.request_listing_featured_promotion(uuid) from public, anon;
grant execute on function public.request_listing_featured_promotion(uuid) to authenticated;
revoke all on function public.review_listing_featured_promotion(uuid,text,text,text) from public, anon;
grant execute on function public.review_listing_featured_promotion(uuid,text,text,text) to authenticated;

create or replace function private.guard_featured_listing_changes()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if (new.is_featured is distinct from old.is_featured
      or new.featured_until is distinct from old.featured_until)
     and not coalesce(public.is_conecta_admin(), false) then
    raise exception 'Apenas administradores podem alterar o destaque premium.';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_featured_listing_changes on public.listings;
create trigger guard_featured_listing_changes
before update of is_featured, featured_until on public.listings
for each row execute function private.guard_featured_listing_changes();

create or replace view public.public_listings
with (security_invoker = true)
as
select id, title, category, subcategory, island, municipality, price,
       description, whatsapp, phone, image_url, listing_status, created_at,
       (is_featured and featured_until > now()) as is_featured,
       featured_until
from public.listings
where listing_status = 'published';

grant select on public.public_listings to anon, authenticated;
