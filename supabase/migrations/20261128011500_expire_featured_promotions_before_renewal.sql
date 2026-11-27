
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

  update public.listing_featured_promotions
    set status = 'expired'
  where listing_id = p_listing_id
    and status = 'active'
    and featured_until <= now();

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

revoke all on function public.request_listing_featured_promotion(uuid) from public, anon;
grant execute on function public.request_listing_featured_promotion(uuid) to authenticated;
