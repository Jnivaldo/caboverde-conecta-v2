-- Automatic publication for complete listings, with post-publication quality review.
-- Content approval is automatic; payment confirmation remains mandatory for paid listings.

alter table public.listings
  add column if not exists moderation_note text;

alter table public.listings
  drop constraint if exists listings_title_check;

alter table public.listings
  add constraint listings_title_check
  check (char_length(title) between 1 and 100);

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

  if char_length(trim(coalesce(p_title, ''))) < 1
     or char_length(trim(coalesce(p_title, ''))) > 100
     or char_length(trim(coalesce(p_category, ''))) < 1
     or char_length(trim(coalesce(p_category, ''))) > 60
     or char_length(trim(coalesce(p_subcategory, ''))) > 80
     or char_length(trim(coalesce(p_island, ''))) < 1
     or char_length(trim(coalesce(p_municipality, ''))) < 1
     or char_length(trim(coalesce(p_price, ''))) > 60
     or char_length(coalesce(p_description, '')) > 3000
     or char_length(coalesce(p_whatsapp, '')) > 20
     or char_length(coalesce(p_phone, '')) > 20
     or char_length(coalesce(p_image_url, '')) > 2048 then
    raise exception 'INVALID_LISTING_DATA';
  end if;

  if nullif(trim(coalesce(p_image_url, '')), '') is not null
     and lower(trim(p_image_url)) not like 'https://%' then
    raise exception 'INVALID_IMAGE_URL';
  end if;

  if coalesce(trim(p_whatsapp), '') = '' and coalesce(trim(p_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;

  if (nullif(trim(p_whatsapp), '') is not null
      and char_length(regexp_replace(p_whatsapp, '[^0-9]', '', 'g')) not between 7 and 15)
     or (nullif(trim(p_phone), '') is not null
      and char_length(regexp_replace(p_phone, '[^0-9]', '', 'g')) not between 7 and 15) then
    raise exception 'INVALID_CONTACT';
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
    v_user_id, v_email, trim(p_title), trim(coalesce(nullif(p_category, ''), 'Outros')),
    coalesce(nullif(trim(p_subcategory), ''), 'Geral'),
    trim(p_island), trim(p_municipality),
    coalesce(nullif(trim(p_price), ''), 'Preço sob consulta'),
    coalesce(p_description, ''), coalesce(p_whatsapp, ''), coalesce(p_phone, ''),
    coalesce(p_image_url, ''),
    case when nullif(trim(coalesce(p_image_url, '')), '') is not null then 'published' else 'pending' end,
    'confirmed', 'free_launch', 'CAMPANHA-50-GRATIS', v_slot
  )
  returning * into v_listing;

  return v_listing;
end;
$function$;

create or replace function public.submit_paid_listing(
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

  if char_length(trim(coalesce(p_title, ''))) < 1
     or char_length(trim(coalesce(p_title, ''))) > 100
     or char_length(trim(coalesce(p_category, ''))) < 1
     or char_length(trim(coalesce(p_category, ''))) > 60
     or char_length(trim(coalesce(p_subcategory, ''))) > 80
     or char_length(trim(coalesce(p_island, ''))) < 1
     or char_length(trim(coalesce(p_municipality, ''))) < 1
     or char_length(trim(coalesce(p_price, ''))) > 60
     or char_length(coalesce(p_description, '')) > 3000
     or char_length(coalesce(p_whatsapp, '')) > 20
     or char_length(coalesce(p_phone, '')) > 20
     or char_length(coalesce(p_image_url, '')) > 2048 then
    raise exception 'INVALID_LISTING_DATA';
  end if;

  if nullif(trim(coalesce(p_image_url, '')), '') is not null
     and lower(trim(p_image_url)) not like 'https://%' then
    raise exception 'INVALID_IMAGE_URL';
  end if;

  if coalesce(trim(p_whatsapp), '') = '' and coalesce(trim(p_phone), '') = '' then
    raise exception 'CONTACT_REQUIRED';
  end if;

  if (nullif(trim(p_whatsapp), '') is not null
      and char_length(regexp_replace(p_whatsapp, '[^0-9]', '', 'g')) not between 7 and 15)
     or (nullif(trim(p_phone), '') is not null
      and char_length(regexp_replace(p_phone, '[^0-9]', '', 'g')) not between 7 and 15) then
    raise exception 'INVALID_CONTACT';
  end if;

  select s.slots_claimed into v_slots
  from public.launch_campaign_state s
  where s.id = true
  for update;

  if v_slots is null then
    raise exception 'CAMPAIGN_COUNTER_UNAVAILABLE';
  end if;

  if v_slots < 50 then
    raise exception 'FREE_CAMPAIGN_STILL_AVAILABLE';
  end if;

  insert into public.listings (
    owner_id, owner_email, title, category, subcategory, island,
    municipality, price, description, whatsapp, phone, image_url,
    listing_status, payment_status, payment_method, proof_ref, slot_number
  )
  values (
    v_user_id, v_email, trim(p_title), trim(coalesce(nullif(p_category, ''), 'Outros')),
    coalesce(nullif(trim(p_subcategory), ''), 'Geral'),
    trim(p_island), trim(p_municipality),
    coalesce(nullif(trim(p_price), ''), 'Preço sob consulta'),
    coalesce(p_description, ''), coalesce(p_whatsapp, ''), coalesce(p_phone, ''),
    coalesce(p_image_url, ''), 'pending', 'pending', 'bank_transfer', null, null
  )
  returning * into v_listing;

  return v_listing;
end;
$function$;

-- Owners may republish their own suspended/pending ad, but cannot alter moderation,
-- ownership, payment or campaign fields. Every publication transition is validated.
create or replace function public.guard_listing_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_is_admin boolean := (select public.is_conecta_admin());
  v_has_photo boolean;
begin
  if not v_is_admin then
    if new.owner_id is distinct from old.owner_id
      or new.owner_email is distinct from old.owner_email
      or new.payment_status is distinct from old.payment_status
      or new.payment_method is distinct from old.payment_method
      or new.proof_ref is distinct from old.proof_ref
      or new.slot_number is distinct from old.slot_number
      or new.moderation_note is distinct from old.moderation_note then
      raise exception 'Campos de pagamento, propriedade e moderação só podem ser alterados pela administração.';
    end if;

    if new.listing_status is distinct from old.listing_status
      and not (
        new.listing_status = 'published'
        and old.listing_status in ('pending', 'suspended')
        and old.owner_id = (select auth.uid())
      ) then
      raise exception 'Só a administração pode alterar este estado.';
    end if;
  end if;

  if new.listing_status = 'published'
     and old.listing_status is distinct from new.listing_status then
    select (
      nullif(trim(new.image_url), '') is not null
      or exists (
        select 1 from public.listing_media m
        where m.listing_id = new.id and m.media_type = 'image'
      )
    ) into v_has_photo;

    if new.payment_status <> 'confirmed'
       or nullif(trim(new.title), '') is null
       or nullif(trim(new.island), '') is null
       or nullif(trim(new.municipality), '') is null
       or (nullif(trim(new.whatsapp), '') is null and nullif(trim(new.phone), '') is null)
       or not coalesce(v_has_photo, false) then
      raise exception 'PUBLICATION_REQUIREMENTS_NOT_MET: nome, fotografia, localização, contacto e pagamento confirmado são necessários.';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

-- When the owner uploads a photo to a free, pending listing, publish it immediately.
create or replace function private.auto_publish_listing_after_photo_upload()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.media_type <> 'image'
     or auth.uid() is null
     or auth.uid() <> new.owner_id then
    return new;
  end if;

  update public.listings l
  set listing_status = 'published'
  where l.id = new.listing_id
    and l.owner_id = new.owner_id
    and l.listing_status = 'pending'
    and l.payment_status = 'confirmed'
    and nullif(trim(l.title), '') is not null
    and nullif(trim(l.island), '') is not null
    and nullif(trim(l.municipality), '') is not null
    and (nullif(trim(l.whatsapp), '') is not null or nullif(trim(l.phone), '') is not null);

  return new;
end;
$function$;

revoke all on function private.auto_publish_listing_after_photo_upload()
  from public, anon, authenticated;

drop trigger if exists listing_media_auto_publish on public.listing_media;
create trigger listing_media_auto_publish
after insert on public.listing_media
for each row execute function private.auto_publish_listing_after_photo_upload();

-- Send the owner a useful moderation note and keep admins informed for post-publication review.
create or replace function private.notify_listing_events()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  admin_row record;
begin
  if tg_op = 'INSERT' then
    perform private.insert_user_notification(
      new.owner_id,
      'listing:' || new.id::text || ':submitted',
      'listing',
      case when new.listing_status = 'published' then 'Anúncio publicado automaticamente' else 'Anúncio recebido' end,
      case
        when new.listing_status = 'published' then 'O seu anúncio "' || new.title || '" já está visível. A equipa poderá analisá-lo e pedir melhorias, se necessário.'
        when new.payment_status = 'pending' then 'Recebemos o seu anúncio. A publicação fica disponível depois da confirmação do pagamento e da verificação dos elementos essenciais.'
        else 'Recebemos o seu anúncio. Assim que a fotografia for carregada, ficará publicado automaticamente.'
      end,
      '/?tab=account',
      new.id
    );

    for admin_row in
      select p.id
      from public.profiles p
      where p.account_state = 'active'
        and p.role in ('master', 'moderator')
        and p.id <> new.owner_id
    loop
      perform private.insert_user_notification(
        admin_row.id,
        'listing:' || new.id::text || ':admin_review',
        'admin',
        'Novo anúncio para revisão',
        'O anúncio "' || new.title || '" foi recebido e está disponível para análise da equipa.',
        '/?tab=admin',
        new.id
      );
    end loop;

  elsif old.listing_status is distinct from new.listing_status
    and new.listing_status in ('published', 'rejected', 'suspended') then

    perform private.insert_user_notification(
      new.owner_id,
      'listing:' || new.id::text || ':status:' || new.listing_status || ':' || new.updated_at::text,
      'listing',
      case new.listing_status
        when 'published' then case when old.listing_status = 'suspended' then 'Anúncio novamente publicado' else 'Anúncio publicado automaticamente' end
        when 'rejected' then 'Anúncio não aprovado'
        else 'Anúncio suspenso para melhorias'
      end,
      case new.listing_status
        when 'published' then 'O seu anúncio "' || new.title || '" está novamente visível no CaboVerde Conecta.'
        when 'rejected' then 'O seu anúncio "' || new.title || '" não foi aprovado. Consulte a sua conta para mais informações.'
        else 'O seu anúncio "' || new.title || '" foi temporariamente suspenso. O que deve melhorar: ' || coalesce(nullif(trim(new.moderation_note), ''), 'Consulte a sua conta e contacte o suporte.')
      end,
      '/?tab=account',
      new.id
    );
  end if;

  return new;
end;
$function$;

revoke all on function private.notify_listing_events() from public, anon, authenticated;
