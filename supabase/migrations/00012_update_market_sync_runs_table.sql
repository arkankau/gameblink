-- Update market_sync_runs table with complete schema
drop table if exists public.market_sync_runs;

create table public.market_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text,
  dry_run boolean default false,
  started_at timestamptz not null,
  finished_at timestamptz,
  duration_ms integer,
  total_fetched integer default 0,
  attempted integer default 0,
  updated integer default 0,
  skipped integer default 0,
  failed integer default 0,
  mock_updated integer default 0,
  live_updated integer default 0,
  details jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.market_sync_runs enable row level security;

-- Authenticated users can view sync runs
create policy "Authenticated users can view sync runs"
  on public.market_sync_runs
  for select
  to authenticated
  using (true);

-- Create index for faster queries
create index if not exists market_sync_runs_started_at_idx on public.market_sync_runs(started_at desc);

comment on table public.market_sync_runs is 'Logs for market sync pipeline runs with detailed summaries';
comment on column public.market_sync_runs.source is 'Source of sync trigger (manual-dev, pg_cron, external-cron, etc.)';
comment on column public.market_sync_runs.details is 'Detailed per-market results if includeDetails was true';