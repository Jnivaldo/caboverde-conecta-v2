-- Index the admin reviewer foreign key for efficient joins and cleanup.
create index if not exists listing_featured_promotions_reviewed_by_idx
  on public.listing_featured_promotions (reviewed_by);
