create or replace function public.review_listing_report(p_report_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not public.is_conecta_admin() then
    raise exception 'Acesso reservado à administração.';
  end if;
  if p_status not in ('reviewed', 'dismissed', 'action_taken') then
    raise exception 'Estado de denúncia inválido.';
  end if;
  update public.listing_reports
     set status = p_status,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_report_id
     and status = 'pending';
  if not found then
    raise exception 'Denúncia não encontrada ou já analisada.';
  end if;
end;
$$;
revoke all on function public.review_listing_report(uuid, text) from public, anon, authenticated;
grant execute on function public.review_listing_report(uuid, text) to authenticated;
