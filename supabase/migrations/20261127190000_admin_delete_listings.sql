grant delete on table public.listings to authenticated;

drop policy if exists "admin delete listings" on public.listings;
create policy "admin delete listings"
on public.listings
for delete
to authenticated
using ((select public.is_conecta_admin()));