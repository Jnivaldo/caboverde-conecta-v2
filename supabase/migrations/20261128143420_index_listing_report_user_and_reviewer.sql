create index if not exists listing_reports_reporter_created_at_idx
  on public.listing_reports (reporter_id, created_at desc);

create index if not exists listing_reports_reviewed_by_idx
  on public.listing_reports (reviewed_by);
