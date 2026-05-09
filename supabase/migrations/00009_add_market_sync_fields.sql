-- Add sync tracking fields to markets table
alter table public.markets
add column if not exists sync_metadata jsonb default '{}'::jsonb,
add column if not exists data_status text default 'mock',
add column if not exists last_synced_at timestamptz,
add column if not exists sync_error text;

-- Add comment for documentation
comment on column public.markets.sync_metadata is 'Metadata for syncing external data (city, symbol, base, quote, targetPrice, etc.)';
comment on column public.markets.data_status is 'Status of external data: live, mock, failed';
comment on column public.markets.last_synced_at is 'Last time market data was synced from external source';
comment on column public.markets.sync_error is 'Error message if sync failed';

-- Ensure history is JSONB type (should already be, but verify)
-- If history was text, this would convert it, but we'll handle that in the sync function