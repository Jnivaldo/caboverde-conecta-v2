create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('fraude','informacao_falsa','conteudo_inadequado','anuncio_duplicado','outro')),
  details text,
  status text not null default 'pending' check (status in ('pending','reviewed','dismissed','action_taken')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create unique index if not exists listing_reports_one_per_user_listing
  on public.listing_reports (listing_id, reporter_id);

create index if not exists listing_reports_status_created_at_idx
  on public.listing_reports (status, created_at desc);

alter table public.listing_reports enable row level security;

revoke all privileges on public.listing_reports from anon, authenticated;
grant select on public.listing_reports to authenticated;

drop policy if exists "admins read listing reports" on public.listing_reports;
create policy "admins read listing reports"
  on public.listing_reports
  for select to authenticated
  using ((select public.is_conecta_admin()));

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
begin
  if v_user_id is null then
    raise exception 'É necessário iniciar sessão para denunciar um anúncio.';
  end if;

  if p_reason not in ('fraude','informacao_falsa','conteudo_inadequado','anuncio_duplicado','outro') then
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
