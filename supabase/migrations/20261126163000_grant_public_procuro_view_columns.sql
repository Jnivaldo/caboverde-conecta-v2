-- Allow invoker views to read only their explicitly projected/filter columns.
grant usage on schema private to anon, authenticated;
grant select (moderation_status) on public.procurement_requests to anon;
grant select (moderation_status) on public.procurement_offers to anon;
