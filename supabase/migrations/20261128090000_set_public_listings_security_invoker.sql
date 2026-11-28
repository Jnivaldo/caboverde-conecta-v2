-- Ensure public listing reads obey the querying role's grants and RLS policies.
alter view public.public_listings set (security_invoker = true);
