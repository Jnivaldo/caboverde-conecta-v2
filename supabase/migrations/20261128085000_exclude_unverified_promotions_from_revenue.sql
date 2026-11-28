-- Do not count legacy/uncorroborated Premium records as income.
-- Confirmed paid upgrades must have both a bank and a payment reference.
create or replace function public.get_admin_revenue_summary()
returns table(period_label text, total_cve bigint, transaction_count bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Atlantic/Cape_Verde')::date;
begin
  if auth.uid() is null or not coalesce(public.is_conecta_admin(), false) then
    raise exception 'FORBIDDEN';
  end if;
  return query
  with confirmed_revenue as (
    select p.amount_cve::bigint as amount_cve,
           (p.reviewed_at at time zone 'Atlantic/Cape_Verde')::date as paid_date
    from public.listing_payment_submissions p
    where p.status = 'approved' and p.reviewed_at is not null
    union all
    select f.amount_cve::bigint,
           (f.paid_at at time zone 'Atlantic/Cape_Verde')::date
    from public.listing_featured_promotions f
    where f.status = 'active'
      and f.paid_at is not null
      and f.payment_reference is not null
      and f.bank in ('BCA','BCN')
  ),
  periods as (
    select 'Hoje'::text as label, v_today as starts_on, v_today + 1 as ends_on
    union all
    select 'Esta semana', date_trunc('week', v_today::timestamp)::date,
           date_trunc('week', v_today::timestamp)::date + 7
    union all
    select 'Este mês', date_trunc('month', v_today::timestamp)::date,
           (date_trunc('month', v_today::timestamp) + interval '1 month')::date
  )
  select p.label, coalesce(sum(c.amount_cve), 0)::bigint, count(c.amount_cve)::bigint
  from periods p
  left join confirmed_revenue c
    on c.paid_date >= p.starts_on and c.paid_date < p.ends_on
  group by p.label,
    case p.label when 'Hoje' then 1 when 'Esta semana' then 2 else 3 end
  order by case p.label when 'Hoje' then 1 when 'Esta semana' then 2 else 3 end;
end;
$$;
revoke execute on function public.get_admin_revenue_summary() from anon, public;
grant execute on function public.get_admin_revenue_summary() to authenticated;
