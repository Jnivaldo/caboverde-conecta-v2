-- Enforce the Procuro & Ofereço approval rule in the database itself.
-- An offer can only become public when its parent request is already public,
-- active (or negotiating), not expired, and belongs to a different user.
-- This protects direct API/admin updates as well as the standard admin UI.

create or replace function private.guard_procurement_offer_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  request_is_eligible boolean;
begin
  if new.moderation_status <> 'approved' then
    return new;
  end if;

  -- Revalidate only when approval is being introduced or the parent request changes.
  if tg_op = 'UPDATE'
    and old.moderation_status = 'approved'
    and new.moderation_status = 'approved'
    and old.request_id = new.request_id then
    return new;
  end if;

  select exists (
    select 1
    from public.procurement_requests r
    where r.id = new.request_id
      and r.moderation_status = 'approved'
      and r.status in ('active', 'negotiating')
      and r.expires_at > now()
      and r.requester_id <> new.supplier_id
  )
  into request_is_eligible;

  if not request_is_eligible then
    raise exception
      'A proposta só pode ser aprovada quando o pedido associado estiver publicado, ativo, dentro da validade e pertencer a outro utilizador.'
      using errcode = '23514';
  end if;

  return new;
end;
$function$;

revoke all on function private.guard_procurement_offer_approval()
  from public, anon, authenticated;

drop trigger if exists guard_procurement_offer_approval
  on public.procurement_offers;

create trigger guard_procurement_offer_approval
before insert or update of moderation_status, request_id
on public.procurement_offers
for each row
execute function private.guard_procurement_offer_approval();
