-- The public launch counter is read by both anonymous visitors and signed-in users.
-- Keep the campaign table private while allowing the read-only status RPC to both roles.
grant execute on function public.get_launch_campaign_status() to anon, authenticated;
