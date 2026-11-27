-- Private in-app notification inbox with database-generated events.
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null,
  notification_type text not null check (notification_type in ('listing','procurement','offer','admin')),
  title text not null check (char_length(title) between 1 and 140),
  message text not null check (char_length(message) between 1 and 500),
  target_path text not null default '/',
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (user_id, event_key)
);
create index if not exists user_notifications_inbox_idx on public.user_notifications (user_id, created_at desc);
create index if not exists user_notifications_unread_idx on public.user_notifications (user_id, created_at desc) where read_at is null;
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon, authenticated;
grant select on public.user_notifications to authenticated;
grant update (read_at) on public.user_notifications to authenticated;
create policy user_notifications_select_own on public.user_notifications for select to authenticated using (user_id = (select auth.uid()));
create policy user_notifications_update_own on public.user_notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.insert_user_notification(p_user_id uuid,p_event_key text,p_type text,p_title text,p_message text,p_target_path text,p_entity_id uuid default null)
returns void language sql security definer set search_path = ''
as $function$
  insert into public.user_notifications (user_id,event_key,notification_type,title,message,target_path,entity_id)
  values (p_user_id,p_event_key,p_type,left(p_title,140),left(p_message,500),p_target_path,p_entity_id)
  on conflict (user_id,event_key) do nothing;
$function$;
revoke all on function private.insert_user_notification(uuid,text,text,text,text,text,uuid) from public,anon,authenticated;

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

revoke all on function private.notify_listing_events() from public,anon,authenticated;
revoke all on function private.notify_procurement_request_events() from public,anon,authenticated;
revoke all on function private.notify_procurement_offer_events() from public,anon,authenticated;

drop trigger if exists user_notification_listing_events on public.listings;
create trigger user_notification_listing_events after insert or update of listing_status on public.listings for each row execute function private.notify_listing_events();
drop trigger if exists user_notification_request_events on public.procurement_requests;
create trigger user_notification_request_events after insert or update of moderation_status,status on public.procurement_requests for each row execute function private.notify_procurement_request_events();
drop trigger if exists user_notification_offer_events on public.procurement_offers;
create trigger user_notification_offer_events after insert or update of moderation_status on public.procurement_offers for each row execute function private.notify_procurement_offer_events();

do $publication$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='user_notifications') then
    alter publication supabase_realtime add table public.user_notifications;
  end if;
end;
$publication$;
