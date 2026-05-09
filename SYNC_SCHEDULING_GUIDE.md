# Market Sync Pipeline - Scheduling Guide

## Overview

The `sync-live-markets` Edge Function synchronizes market prices from external data sources (Weather, Stock, Forex APIs) and updates the database. This guide explains how to trigger and schedule the sync pipeline.

---

## Manual Trigger Methods

### 1. Admin UI (Recommended for Development)

Navigate to `/admin/sync` in your browser:

```
https://your-app-url.com/admin/sync
```

Features:
- Run sync with custom options (dry run, force mock, category filter, etc.)
- View detailed per-market results
- See sync duration and summary statistics
- Debug failed/skipped markets

### 2. Supabase Functions Invoke (Frontend)

```typescript
const { data, error } = await supabase.functions.invoke('sync-live-markets', {
  body: {
    source: 'manual-dev',
    dryRun: false,
    forceMock: false,
    category: undefined,
    marketId: undefined,
    maxMarkets: 50,
    includeDetails: true,
  },
});

console.log('Sync result:', data);
```

### 3. cURL Command

```bash
curl -X POST \
  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-live-markets' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "source": "manual-curl",
    "maxMarkets": 50,
    "includeDetails": true
  }'
```

Replace:
- `YOUR_PROJECT_REF` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key (for manual testing only)

---

## Scheduled Sync (Production)

### Option 1: Supabase pg_cron + pg_net (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable extensions (already done in migration)
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Schedule sync every 1 minute
select cron.schedule(
  'sync-live-markets-every-minute',
  '* * * * *',
  $$
  select
    net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-live-markets',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object(
        'source', 'pg_cron',
        'maxMarkets', 50
      )
    ) as request_id;
  $$
);
```

**Important**: Replace placeholders:
- `YOUR_PROJECT_REF` - Your Supabase project reference (e.g., `abcdefghijklmnop`)
- `YOUR_SERVICE_ROLE_KEY` - Your Supabase service role key (found in Project Settings > API)

**Security Note**: The service role key is stored in the database and only accessible by database functions. It is NOT exposed to the frontend.

#### View Scheduled Jobs

```sql
select * from cron.job;
```

#### Unschedule Job

```sql
select cron.unschedule('sync-live-markets-every-minute');
```

#### Change Schedule Interval

```sql
-- Every 30 seconds (not recommended for external APIs)
select cron.unschedule('sync-live-markets-every-minute');
select cron.schedule('sync-live-markets-every-30s', '*/30 * * * * *', $$...$$ );

-- Every 5 minutes
select cron.unschedule('sync-live-markets-every-minute');
select cron.schedule('sync-live-markets-every-5min', '*/5 * * * *', $$...$$ );
```

---

### Option 2: External Cron Service

Use services like:
- GitHub Actions (scheduled workflows)
- Vercel Cron
- AWS EventBridge
- Google Cloud Scheduler
- Render Cron Jobs

Example GitHub Actions workflow (`.github/workflows/sync-markets.yml`):

```yaml
name: Sync Markets
on:
  schedule:
    - cron: '* * * * *'  # Every minute
  workflow_dispatch:  # Allow manual trigger

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Call Sync Function
        run: |
          curl -X POST \
            '${{ secrets.SUPABASE_URL }}/functions/v1/sync-live-markets' \
            -H 'Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}' \
            -H 'Content-Type: application/json' \
            -d '{"source":"github-actions","maxMarkets":50}'
```

Store secrets in GitHub repository settings:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Your service role key

---

### Option 3: Supabase Edge Function Cron (If Available)

Some Supabase plans support native Edge Function scheduling. Check your plan and Supabase documentation for:

```typescript
// In Edge Function config
export const config = {
  schedule: '* * * * *',  // Every minute
};
```

---

## Sync Options Reference

### Request Body Parameters

```typescript
{
  source?: string;                    // Identifier for trigger source
  maxMarkets?: number;                // Limit batch size (default: 50)
  marketId?: string;                  // Sync single market by ID
  category?: string;                  // Sync only one category
  dryRun?: boolean;                   // Compute changes without DB updates
  includeDetails?: boolean;           // Return full per-market results
  forceMock?: boolean;                // Skip external APIs, use mock data
  skipRecentlySyncedSeconds?: number; // Skip markets synced within N seconds
}
```

### Response Structure

```typescript
{
  success: boolean;
  run: {
    runId: string;
    source: string;
    dryRun: boolean;
    startedAt: string;
    finishedAt: string;
    durationMs: number;
  };
  summary: {
    totalFetched: number;
    attempted: number;
    updated: number;
    skipped: number;
    failed: number;
    mockUpdated: number;
    liveUpdated: number;
  };
  results: Array<{
    id: string;
    title: string;
    category: string;
    status: 'updated' | 'skipped' | 'failed';
    dataStatus: 'live' | 'mock' | 'failed';
    oldYesPrice?: number;
    newYesPrice?: number;
    priceDelta?: number;
    reason?: string;
    error?: string;
  }>;
}
```

---

## Category Handlers

The sync function supports all GameBlink categories:

| Category      | Handler                  | External API | Status          |
|---------------|--------------------------|--------------|-----------------|
| Weather       | syncWeatherMarket        | ✅ OpenWeather | Live            |
| Stocks        | syncStockMarket          | ✅ Stock API   | Live            |
| Forex         | syncForexMarket          | ✅ Exchange API| Live            |
| Crypto        | syncCryptoMarket         | ❌ Not configured | Mock fallback |
| Sports        | syncSportsMarket         | ❌ Not configured | Mock fallback |
| Politics      | syncNewsDrivenMarket     | ❌ Not configured | Mock fallback |
| Entertainment | syncNewsDrivenMarket     | ❌ Not configured | Mock fallback |
| Business      | syncNewsDrivenMarket     | ❌ Not configured | Mock fallback |
| Esports       | syncNewsDrivenMarket     | ❌ Not configured | Mock fallback |
| Community     | syncCommunityMarket      | ❌ No external source | Skipped/Mock |

---

## Skip/Fail Reasons

Common reasons returned in results:

- `missing_weather_city` - Weather market has no city metadata
- `unsupported_weather_city` - City not in coordinate database
- `weather_api_failed_using_mock` - Weather API error, using mock fallback
- `missing_stock_symbol` - Stock market has no symbol metadata
- `stock_api_failed_using_mock` - Stock API error, using mock fallback
- `missing_forex_pair` - Forex market has no base/quote currency
- `forex_api_failed_using_mock` - Forex API error, using mock fallback
- `missing_target_price_using_drift` - Stock market has no target price
- `missing_target_rate_using_drift` - Forex market has no target rate
- `crypto_api_not_configured_using_mock` - Crypto API not available
- `sports_api_not_configured_using_mock` - Sports API not available
- `community_market_no_sync_source` - Community market has no sync source
- `force_mock_enabled` - Sync run used forceMock option

---

## Monitoring

### View Sync Run History

Query the `market_sync_runs` table:

```sql
select
  id,
  source,
  started_at,
  duration_ms,
  updated,
  skipped,
  failed,
  mock_updated,
  live_updated
from public.market_sync_runs
order by started_at desc
limit 20;
```

### View Latest Sync Status Per Market

```sql
select
  id,
  title,
  category,
  data_status,
  last_synced_at,
  sync_error
from public.markets
where status = 'live'
order by last_synced_at desc nulls last;
```

---

## Troubleshooting

### Sync Not Running

1. Check pg_cron job exists:
   ```sql
   select * from cron.job where jobname = 'sync-live-markets-every-minute';
   ```

2. Check pg_cron logs:
   ```sql
   select * from cron.job_run_details
   where jobid = (select jobid from cron.job where jobname = 'sync-live-markets-every-minute')
   order by start_time desc
   limit 10;
   ```

3. Verify Edge Function is deployed:
   - Check Supabase Dashboard > Edge Functions
   - Ensure `sync-live-markets` is listed and deployed

### Markets Not Updating

1. Check market status:
   ```sql
   select id, title, status, last_synced_at, sync_error
   from public.markets
   where id = 'YOUR_MARKET_ID';
   ```

2. Run manual sync with dry run:
   - Go to `/admin/sync`
   - Enable "Dry Run"
   - Enter market ID
   - Check reason/error in results

3. Check API keys:
   - Verify `INTEGRATIONS_API_KEY` is set in Edge Function secrets
   - Test API endpoints manually

### High Failure Rate

1. Check API rate limits
2. Increase sync interval (e.g., every 5 minutes instead of 1 minute)
3. Review sync_error messages in markets table
4. Check external API status pages

---

## Best Practices

1. **Start with 1-minute intervals** - Test stability before increasing frequency
2. **Monitor API quotas** - Track external API usage to avoid rate limits
3. **Use dry run for testing** - Test changes without affecting live data
4. **Review sync logs regularly** - Check `market_sync_runs` table for issues
5. **Set up alerts** - Monitor failed sync runs and high error rates
6. **Keep metadata updated** - Ensure markets have required sync_metadata fields

---

## Security Notes

- **Service Role Key**: Only use in server-side contexts (Edge Functions, pg_cron, external cron)
- **Never expose** service role key in frontend code or public repositories
- **Anon Key**: Safe for manual testing but has limited permissions
- **RLS Policies**: Ensure proper Row Level Security on all tables

---

## Support

For issues or questions:
1. Check sync run logs in `market_sync_runs` table
2. Review per-market errors in `markets.sync_error` column
3. Test manually via `/admin/sync` page
4. Check Supabase Edge Function logs in dashboard
