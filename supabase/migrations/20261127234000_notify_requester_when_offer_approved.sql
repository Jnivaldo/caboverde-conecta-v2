-- Notify both supplier and requester when a proposal is approved.
-- The requester is notified only after moderation makes the proposal visible.
create or replace function private.notify_procurement_offer_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  request_row record;
  admin_row record;
begin
  if tg_op = 'INSERT' then
    select r.id, r.requester_id, r.title
      into request_row
      from public.procurement_requests r
      where r.id = new.request_id;

    if request_row.requester_id is not null then
      perform private.insert_user_notification(
        request_row.requester_id,
        'offer:' || new.id::text || ':received',
        'offer',
        'Nova proposta recebida',
        'Recebeu uma proposta para "' || request_row.title || '". A proposta ficará visível após moderação.',
        '/?tab=requests',
        new.request_id
      );
    end if;

    perform private.insert_user_notification(
      new.supplier_id,
      'offer:' || new.id::text || ':submitted',
      'offer',
      'Proposta enviada',
      'A sua proposta foi recebida e aguarda aprovação.',
      '/?tab=requests',
      new.request_id
    );

    for admin_row in
      select p.id
      from public.profiles p
      where p.account_state = 'active'
        and p.role in ('master', 'moderator')
        and p.id not in (new.supplier_id, coalesce(request_row.requester_id, new.supplier_id))
    loop
      perform private.insert_user_notification(
        admin_row.id,
        'offer:' || new.id::text || ':admin_pending',
        'admin',
        'Nova proposta para análise',
        'Uma proposta para "' || coalesce(request_row.title, 'pedido') || '" aguarda moderação.',
        '/?tab=admin',
        new.request_id
      );
    end loop;

  elsif old.moderation_status is distinct from new.moderation_status
    and new.moderation_status in ('approved', 'rejected') then

    select r.id, r.requester_id, r.title
      into request_row
      from public.procurement_requests r
      where r.id = new.request_id;

    perform private.insert_user_notification(
      new.supplier_id,
      'offer:' || new.id::text || ':moderation:' || new.moderation_status,
      'offer',
      case new.moderation_status
        when 'approved' then 'Proposta aprovada'
        else 'Proposta não aprovada'
      end,
      case new.moderation_status
        when 'approved' then 'A sua proposta foi aprovada e já pode ser consultada pelo requerente.'
        else 'A sua proposta não foi aprovada.'
      end,
      '/?tab=requests',
      new.request_id
    );

    if new.moderation_status = 'approved'
      and request_row.requester_id is not null
      and request_row.requester_id <> new.supplier_id then
      perform private.insert_user_notification(
        request_row.requester_id,
        'offer:' || new.id::text || ':visible_to_requester',
        'offer',
        'Nova proposta disponível',
        'A proposta para o seu pedido "' || request_row.title || '" foi aprovada. Já pode consultá-la na sua conta.',
        '/?tab=requests',
        new.request_id
      );
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function private.notify_procurement_offer_events() from public, anon, authenticated;
