-- Restrict campaign state to server/admin access; public counter remains via RPC.
revoke all on table public.launch_campaign_state from anon, authenticated;
revoke execute on function public.get_launch_campaign_status() from authenticated;
grant execute on function public.get_launch_campaign_status() to anon;

-- Optimize owner insert policy by evaluating JWT functions once per query.
drop policy if exists "authenticated owner insert listing" on public.listings;
create policy "authenticated owner insert listing"
on public.listings for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and owner_email = (select auth.jwt()->>'email')
  and listing_status = 'pending'
  and payment_status = 'pending'
  and slot_number is null
);
