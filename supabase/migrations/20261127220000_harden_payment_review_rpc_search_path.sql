-- Harden payment review RPC against search_path manipulation.
CREATE OR REPLACE FUNCTION public.review_listing_payment(p_payment_id uuid, p_decision text, p_admin_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_payment public.listing_payment_submissions%rowtype;
begin
  if auth.uid() is null or not public.is_conecta_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_decision not in ('approved','rejected') then
    raise exception 'INVALID_DECISION';
  end if;

  select * into v_payment
  from public.listing_payment_submissions
  where id = p_payment_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'PAYMENT_ALREADY_REVIEWED';
  end if;

  update public.listing_payment_submissions
  set status = p_decision,
      admin_note = nullif(trim(coalesce(p_admin_note,'')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_payment_id;

  if p_decision = 'approved' then
    update public.listings
    set payment_status = 'confirmed',
        payment_method = 'bank_transfer',
        proof_ref = v_payment.proof_path,
        updated_at = now()
    where id = v_payment.listing_id
      and owner_id = v_payment.user_id
      and payment_status = 'pending'
      and listing_status = 'pending';
    if not found then
      raise exception 'LISTING_NOT_ELIGIBLE';
    end if;
  end if;
  -- A rejected proof leaves the listing payment pending so the owner can submit a corrected proof.
end;
$function$;
