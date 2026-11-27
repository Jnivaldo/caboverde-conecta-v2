create table if not exists public.listing_payment_submissions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bank text not null check (bank in ('BCA','BCN')),
  amount_cve integer not null default 1500 check (amount_cve = 1500),
  transfer_reference text not null check (char_length(trim(transfer_reference)) between 3 and 120),
  proof_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint listing_payment_submissions_review_state check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (status in ('approved','rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);
create index if not exists listing_payment_submissions_listing_idx on public.listing_payment_submissions(listing_id, created_at desc);
create index if not exists listing_payment_submissions_user_idx on public.listing_payment_submissions(user_id, created_at desc);
alter table public.listing_payment_submissions enable row level security;
revoke all on public.listing_payment_submissions from anon, authenticated;
grant select, insert on public.listing_payment_submissions to authenticated;
create policy "payment submissions owner or admin read" on public.listing_payment_submissions for select to authenticated using (user_id = (select auth.uid()) or public.is_conecta_admin());
create policy "payment submissions owner insert pending" on public.listing_payment_submissions for insert to authenticated with check (
  user_id = (select auth.uid()) and status = 'pending' and reviewed_by is null and reviewed_at is null
  and exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = (select auth.uid()) and l.payment_status = 'pending' and l.listing_status = 'pending')
);
revoke update on public.listings from authenticated;
grant update (title, category, subcategory, island, municipality, price, description, whatsapp, phone, image_url) on public.listings to authenticated;
create or replace function public.review_listing_payment(p_payment_id uuid, p_decision text, p_admin_note text default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_payment public.listing_payment_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_conecta_admin() then raise exception 'FORBIDDEN'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'INVALID_DECISION'; end if;
  select * into v_payment from public.listing_payment_submissions where id = p_payment_id for update;
  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if v_payment.status <> 'pending' then raise exception 'PAYMENT_ALREADY_REVIEWED'; end if;
  update public.listing_payment_submissions set status=p_decision, admin_note=nullif(trim(coalesce(p_admin_note,'')),''), reviewed_by=auth.uid(), reviewed_at=now() where id=p_payment_id;
  if p_decision='approved' then
    update public.listings set payment_status='confirmed', payment_method='bank_transfer', proof_ref=v_payment.proof_path, updated_at=now()
    where id=v_payment.listing_id and owner_id=v_payment.user_id and payment_status='pending';
    if not found then raise exception 'LISTING_NOT_ELIGIBLE'; end if;
  else
    update public.listings set payment_status='rejected', updated_at=now()
    where id=v_payment.listing_id and owner_id=v_payment.user_id and payment_status='pending';
  end if;
end; $$;
revoke all on function public.review_listing_payment(uuid,text,text) from public, anon;
grant execute on function public.review_listing_payment(uuid,text,text) to authenticated;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('payment-proofs','payment-proofs',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp','application/pdf'];
create policy "payment proof owner upload" on storage.objects for insert to authenticated with check (
  bucket_id='payment-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (select 1 from public.listings l where l.id::text=(storage.foldername(name))[2] and l.owner_id=(select auth.uid()) and l.payment_status='pending' and l.listing_status='pending')
);
create policy "payment proof owner or admin read" on storage.objects for select to authenticated using (
  bucket_id='payment-proofs' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_conecta_admin())
);