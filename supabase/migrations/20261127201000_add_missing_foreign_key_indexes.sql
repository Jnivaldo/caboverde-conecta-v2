-- Add covering indexes for foreign keys identified by Supabase Performance Advisor.
create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);
create index if not exists audit_logs_listing_id_idx
  on public.audit_logs (listing_id);
create index if not exists category_suggestions_reviewed_by_idx
  on public.category_suggestions (reviewed_by);
create index if not exists listing_media_owner_id_idx
  on public.listing_media (owner_id);
create index if not exists listing_payment_submissions_reviewed_by_idx
  on public.listing_payment_submissions (reviewed_by);
create index if not exists listings_owner_id_idx
  on public.listings (owner_id);
create index if not exists marketplace_categories_created_by_idx
  on public.marketplace_categories (created_by);
