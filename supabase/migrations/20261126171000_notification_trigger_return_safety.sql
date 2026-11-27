
create or replace function private.notify_listing_events()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare admin_row record;
begin
  if tg_op = 'INSERT' then
    perform private.insert_user_notification(new.owner_id,'listing:'||new.id::text||':submitted','listing','Anúncio recebido','O seu anúncio "'||new.title||'" foi recebido e aguarda análise da equipa.','/?tab=account',new.id);
    for admin_row in select p.id from public.profiles p where p.account_state='active' and p.role in ('master','moderator') and p.id<>new.owner_id loop
      perform private.insert_user_notification(admin_row.id,'listing:'||new.id::text||':admin_pending','admin','Novo anúncio para análise','O anúncio "'||new.title||'" aguarda moderação.','/?tab=admin',new.id);
    end loop;
  elsif old.listing_status is distinct from new.listing_status and new.listing_status in ('published','rejected','suspended') then
    perform private.insert_user_notification(new.owner_id,'listing:'||new.id::text||':status:'||new.listing_status,'listing',
      case new.listing_status when 'published' then 'Anúncio aprovado e publicado' when 'rejected' then 'Anúncio não aprovado' else 'Anúncio suspenso' end,
      case new.listing_status when 'published' then 'O seu anúncio "'||new.title||'" já está visível no CaboVerde Conecta.' when 'rejected' then 'O seu anúncio "'||new.title||'" não foi aprovado. Consulte a sua conta para mais informações.' else 'O seu anúncio "'||new.title||'" foi temporariamente suspenso. Contacte o suporte se precisar de ajuda.' end,
      '/?tab=account',new.id);
  end if;
  return new;
end;
$function$;

create or replace function private.notify_procurement_request_events()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare admin_row record;
begin
  if tg_op = 'INSERT' then
    perform private.insert_user_notification(new.requester_id,'request:'||new.id::text||':submitted','procurement','Pedido recebido','O seu pedido "'||new.title||'" foi recebido e aguarda aprovação.','/?tab=requests',new.id);
    for admin_row in select p.id from public.profiles p where p.account_state='active' and p.role in ('master','moderator') and p.id<>new.requester_id loop
      perform private.insert_user_notification(admin_row.id,'request:'||new.id::text||':admin_pending','admin','Novo pedido para análise','O pedido "'||new.title||'" aguarda moderação.','/?tab=admin',new.id);
    end loop;
  else
    if old.moderation_status is distinct from new.moderation_status and new.moderation_status in ('approved','rejected') then
      perform private.insert_user_notification(new.requester_id,'request:'||new.id::text||':moderation:'||new.moderation_status,'procurement',
        case new.moderation_status when 'approved' then 'Pedido aprovado' else 'Pedido não aprovado' end,
        case new.moderation_status when 'approved' then 'O seu pedido "'||new.title||'" já está publicado.' else 'O seu pedido "'||new.title||'" não foi aprovado.' end,'/?tab=requests',new.id);
    end if;
    if old.status is distinct from new.status then
      perform private.insert_user_notification(new.requester_id,'request:'||new.id::text||':status:'||new.status,'procurement','Estado do pedido atualizado',
        'O estado do seu pedido "'||new.title||'" foi atualizado para '||case new.status when 'negotiating' then 'em negociação' when 'completed' then 'concluído' else 'ativo' end||'.','/?tab=requests',new.id);
    end if;
  end if;
  return new;
end;
$function$;

create or replace function private.notify_procurement_offer_events()
returns trigger language plpgsql security definer set search_path = ''
as $function$
declare request_row record; admin_row record;
begin
  if tg_op = 'INSERT' then
    select r.id,r.requester_id,r.title into request_row from public.procurement_requests r where r.id=new.request_id;
    if request_row.requester_id is not null then
      perform private.insert_user_notification(request_row.requester_id,'offer:'||new.id::text||':received','offer','Nova proposta recebida','Recebeu uma proposta para "'||request_row.title||'". A proposta ficará visível após moderação.','/?tab=requests',new.request_id);
    end if;
    perform private.insert_user_notification(new.supplier_id,'offer:'||new.id::text||':submitted','offer','Proposta enviada','A sua proposta foi recebida e aguarda aprovação.','/?tab=requests',new.request_id);
    for admin_row in select p.id from public.profiles p where p.account_state='active' and p.role in ('master','moderator') and p.id not in (new.supplier_id,coalesce(request_row.requester_id,new.supplier_id)) loop
      perform private.insert_user_notification(admin_row.id,'offer:'||new.id::text||':admin_pending','admin','Nova proposta para análise','Uma proposta para "'||coalesce(request_row.title,'pedido')||'" aguarda moderação.','/?tab=admin',new.request_id);
    end loop;
  elsif old.moderation_status is distinct from new.moderation_status and new.moderation_status in ('approved','rejected') then
    perform private.insert_user_notification(new.supplier_id,'offer:'||new.id::text||':moderation:'||new.moderation_status,'offer',
      case new.moderation_status when 'approved' then 'Proposta aprovada' else 'Proposta não aprovada' end,
      case new.moderation_status when 'approved' then 'A sua proposta foi aprovada e já pode ser consultada pelo requerente.' else 'A sua proposta não foi aprovada.' end,'/?tab=requests',new.request_id);
  end if;
  return new;
end;
$function$;
