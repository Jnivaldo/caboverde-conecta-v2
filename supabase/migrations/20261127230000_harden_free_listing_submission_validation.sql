-- Harden free listing submission at the database boundary.
-- Keep the existing 50-slot lock/counter transaction and pending moderation flow.
create or replace function public.submit_listing(
  p_title text,
  p_category text,
  p_subcategory text,
  p_island text,
  p_municipality text,
  p_price text,
  p_description text,
  p_whatsapp text,
  p_phone text,
  p_image_url text
)
returns public.listings
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_email text := auth.jwt() ->> 'email';
  v_slots integer;
  v_slot integer;
  v_listing public.listings;
begin
  if v_user_id is null or v_email is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = v_user_id and p.account_state = 'active'
  ) then
    raise exception 'ACCOUNT_NOT_ACTIVE';
  end if;

  if char_length(trim(coalesce(p_title, ''))) < 5
     or char_length(trim(coalesce(p_title, ''))) > 100
     or char_length(trim(coalesce(p_category, ''))) < 2
     or char_length(trim(coalesce(p_category, ''))) > 60
     or char_length(trim(coalesce(p_subcategory, ''))) > 80
     or char_length(trim(coalesce(p_island, ''))) < 2
     or char_length(trim(coalesce(p_municipality, ''))) < 2
     or char_length(trim(coalesce(p_price, ''))) < 1
     or char_length(trim(coalesce(p_price, ''))) > 60
     or char_length(coalesce(p_description, '')) > 3000
     or char_length(coalesce(p_whatsapp, '')) > 20
     or char_length(coalesce(p_phone, '')) > 20
     or char_length(coalesce(p_image_url, '')) > 2048 then
    raise exception 'INVALID_LISTING_DATA';
  end if;

  if coalesce(p_whatsapp, '') = '' and coalesce(p_phone, '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;

  select s.slots_claimed into v_slots
  from public.launch_campaign_state s
  where s.id = true
  for update;

  if v_slots is null then
    raise exception 'CAMPAIGN_COUNTER_UNAVAILABLE';
  end if;

  if v_slots >= 50 then
    raise exception 'CAMPAIGN_FULL_PAYMENT_NOT_AVAILABLE';
  end if;

  update public.launch_campaign_state
  set slots_claimed = slots_claimed + 1, updated_at = now()
  where id = true
  returning slots_claimed into v_slot;

  insert into public.listings (
    owner_id, owner_email, title, category, subcategory, island,
    municipality, price, description, whatsapp, phone, image_url,
    listing_status, payment_status, payment_method, proof_ref, slot_number
  )
  values (
    v_user_id, v_email, trim(p_title), trim(p_category), trim(coalesce(p_subcategory, '')),
    trim(p_island), trim(p_municipality), trim(p_price), coalesce(p_description, ''),
    coalesce(p_whatsapp, ''), coalesce(p_phone, ''), coalesce(p_image_url, ''),
    'pending', 'confirmed', 'free_launch', 'CAMPANHA-50-GRATIS', v_slot
  )
  returning * into v_listing;

  return v_listing;
end;
$function$;
