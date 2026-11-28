create or replace function public.submit_listing_report(
  p_listing_id uuid,
  p_reason text,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_report_id uuid;
  v_user_id uuid := auth.uid();
  v_listing_owner uuid;
  v_existing_report boolean;
  v_recent_reports integer;
begin
  if v_user_id is null then
    raise exception 'É necessário iniciar sessão para denunciar um anúncio.';
  end if;

  if p_reason is null or p_reason not in ('fraude','informacao_falsa','conteudo_inadequado','anuncio_duplicado','outro') then
    raise exception 'Motivo de denúncia inválido.';
  end if;

  if p_details is not null and length(btrim(p_details)) > 1000 then
    raise exception 'A descrição não pode ultrapassar 1000 caracteres.';
  end if;

  select l.owner_id into v_listing_owner
  from public.listings l
  where l.id = p_listing_id and l.listing_status = 'published';

  if v_listing_owner is null then
    raise exception 'Anúncio não encontrado ou indisponível.';
  end if;

  if v_listing_owner = v_user_id then
    raise exception 'Não pode denunciar o seu próprio anúncio.';
  end if;

  -- Serialize submissions per account so parallel requests cannot bypass the daily cap.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  select exists (
    select 1
    from public.listing_reports r
    where r.listing_id = p_listing_id
      and r.reporter_id = v_user_id
  ) into v_existing_report;

  if v_existing_report then
    raise exception 'Já enviou uma denúncia para este anúncio.';
  end if;

  select count(*)::integer into v_recent_reports
  from public.listing_reports r
  where r.reporter_id = v_user_id
    and r.created_at >= pg_catalog.now() - interval '24 hours';

  if v_recent_reports >= 5 then
    raise exception 'Atingiu o limite de 5 denúncias em 24 horas. Tente novamente mais tarde.';
  end if;

  insert into public.listing_reports (listing_id, reporter_id, reason, details)
  values (p_listing_id, v_user_id, p_reason, nullif(btrim(p_details), ''))
  returning id into v_report_id;

  return v_report_id;
exception
  when unique_violation then
    raise exception 'Já enviou uma denúncia para este anúncio.';
end;
$function$;

revoke all on function public.submit_listing_report(uuid, text, text) from public, anon;
grant execute on function public.submit_listing_report(uuid, text, text) to authenticated;
