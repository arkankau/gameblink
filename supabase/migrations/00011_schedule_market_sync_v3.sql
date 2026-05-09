-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Create a table to track sync runs (for monitoring)
create table if not exists public.market_sync_logs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  completed_at timestamptz,
  status text,
  summary jsonb,
  error text
);

-- Enable RLS on sync logs
alter table public.market_sync_logs enable row level security;

-- Authenticated users can view sync logs
create policy "Authenticated users can view sync logs"
  on public.market_sync_logs
  for select
  to authenticated
  using (true);

comment on table public.market_sync_logs is 'Logs for market sync pipeline runs';
comment on column public.market_sync_logs.summary is 'JSON summary of sync results (updated, skipped, failed counts)';
comment on column public.market_sync_logs.error is 'Error message if sync failed';

-- Note: To schedule the sync job, run this SQL manually in Supabase SQL Editor:
-- 
-- select cron.schedule(
--   'sync-live-markets-every-minute',
--   '* * * * *',
--   $$
--   select
--     net.http_post(
--       url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-live-markets',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--       ),
--       body := jsonb_build_object('source', 'pg_cron', 'timestamp', now())
--     ) as request_id;
--   $$
-- );
--
-- Replace YOUR_PROJECT_REF and YOUR_SERVICE_ROLE_KEY with actual values