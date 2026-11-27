create policy procurement_requests_admin_delete
on public.procurement_requests
for delete
to authenticated
using ((select public.is_conecta_admin()));

create policy procurement_offers_admin_delete
on public.procurement_offers
for delete
to authenticated
using ((select public.is_conecta_admin()));

create or replace function public.admin_delete_procurement_request(p_request_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  deleted_count integer;
begin
  if not public.is_conecta_admin() then
    raise exception 'Acesso reservado à administração'
      using errcode = '42501';
  end if;

  delete from public.procurement_offers
  where request_id = p_request_id;

  delete from public.procurement_requests
  where id = p_request_id;

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$function$;

revoke all on function public.admin_delete_procurement_request(uuid) from public;
grant execute on function public.admin_delete_procurement_request(uuid) to authenticated;
