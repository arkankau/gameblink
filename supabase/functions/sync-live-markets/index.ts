import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Request options interface
interface SyncOptions {
  source?: string;
  maxMarkets?: number;
  marketId?: string;
  category?: string;
  dryRun?: boolean;
  includeDetails?: boolean;
  forceMock?: boolean;
  skipRecentlySyncedSeconds?: number;
}

// Market result interface
interface MarketResult {
  id: string;
  title: string;
  category: string;
  source?: string;
  status: 'updated' | 'skipped' | 'failed';
  dataStatus?: 'live' | 'mock' | 'failed' | 'stale';
  oldYesPrice?: number;
  newYesPrice?: number;
  oldNoPrice?: number;
  newNoPrice?: number;
  priceDelta?: number;
  historyLengthBefore?: number;
  historyLengthAfter?: number;
  usedMock?: boolean;
  syncHandler?: string;
  metadataUsed?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
  reason?: string;
  error?: string;
}

// Indonesian city coordinates for weather API
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  Jakarta: { lat: -6.2088, lon: 106.8456 },
  Tangerang: { lat: -6.1781, lon: 106.6300 },
  Bandung: { lat: -6.9175, lon: 107.6191 },
  Surabaya: { lat: -7.2575, lon: 112.7521 },
  Bali: { lat: -8.6705, lon: 115.2126 },
  Medan: { lat: 3.5952, lon: 98.6722 },
  Semarang: { lat: -6.9667, lon: 110.4167 },
  Makassar: { lat: -5.1477, lon: 119.4327 },
  Palembang: { lat: -2.9761, lon: 104.7754 },
  Yogyakarta: { lat: -7.7956, lon: 110.3695 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeCategory(category: unknown): string {
  return String(category ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');
}

function getSyncMetadata(market: any): Record<string, unknown> {
  const raw = market.sync_metadata ?? market.data_source ?? {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  return {};
}

function createMarketResult({
  market,
  status,
  syncHandler,
  oldYesPrice,
  newYesPrice,
  oldHistory,
  newHistory,
  usedMock,
  reason,
  error,
  metadataUsed,
  updatePayload,
}: {
  market: any;
  status: 'updated' | 'skipped' | 'failed';
  syncHandler: string;
  oldYesPrice?: number;
  newYesPrice?: number;
  oldHistory?: Array<{ t: number; y: number }>;
  newHistory?: Array<{ t: number; y: number }>;
  usedMock?: boolean;
  reason?: string;
  error?: string;
  metadataUsed?: Record<string, unknown>;
  updatePayload?: Record<string, unknown>;
}): MarketResult {
  return {
    id: market.id,
    title: market.title,
    category: market.category,
    source: market.source,
    status,
    dataStatus: status === 'failed' ? 'failed' : usedMock ? 'mock' : 'live',
    oldYesPrice,
    newYesPrice,
    oldNoPrice: oldYesPrice == null ? undefined : 100 - oldYesPrice,
    newNoPrice: newYesPrice == null ? undefined : 100 - newYesPrice,
    priceDelta:
      oldYesPrice != null && newYesPrice != null
        ? newYesPrice - oldYesPrice
        : undefined,
    historyLengthBefore: oldHistory?.length,
    historyLengthAfter: newHistory?.length,
    usedMock,
    syncHandler,
    metadataUsed,
    updatePayload,
    reason,
    error,
  };
}

function normalizeHistory(input: unknown): Array<{ t: number; y: number }> {
  let value = input;

  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const t = Number(record.t ?? record.time);
      const y = Number(record.y ?? record.price);
      if (!Number.isFinite(t) || !Number.isFinite(y)) return null;
      return { t, y: clamp(Math.round(y), 1, 99) };
    })
    .filter((p): p is { t: number; y: number } => p !== null);
}

async function syncWeatherMarket(market: any, apiKey: string, forceMock: boolean) {
  const metadata = getSyncMetadata(market);
  const city = metadata.city || market.city;

  if (!city) {
    return {
      shouldUpdate: false,
      reason: 'missing_weather_city',
      metadataUsed: metadata,
    };
  }

  if (!CITY_COORDS[city]) {
    return {
      shouldUpdate: false,
      reason: 'unsupported_weather_city',
      metadataUsed: metadata,
    };
  }

  if (forceMock) {
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'force_mock_enabled',
      metadataUsed: metadata,
    };
  }

  const coords = CITY_COORDS[city];

  try {
    const response = await fetch(
      `https://app-bd0xcwu4joqp-api-wL1zlmgJGAlY.gateway.appmedo.com/data/3.0/onecall?lat=${coords.lat}&lon=${coords.lon}&units=metric`,
      {
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract precipitation probability from hourly forecast
    let precipProb = 0;
    if (data.hourly && data.hourly.length > 0) {
      precipProb = Math.round((data.hourly[0].pop || 0) * 100);
    } else if (data.current) {
      // Fallback: estimate from weather condition
      const condition = data.current.weather?.[0]?.main?.toLowerCase() || '';
      if (condition.includes('rain') || condition.includes('drizzle')) {
        precipProb = 70;
      } else if (condition.includes('cloud')) {
        precipProb = 30;
      } else {
        precipProb = 10;
      }
    }

    const yesPrice = clamp(precipProb, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: false,
      reason: 'weather_api_success',
      metadataUsed: metadata,
      externalDataSummary: { city, precipProb, condition: data.current?.weather?.[0]?.main },
    };
  } catch (err) {
    // Fallback to mock
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'weather_api_failed_using_mock',
      error: err instanceof Error ? err.message : String(err),
      metadataUsed: metadata,
    };
  }
}

async function syncStockMarket(market: any, apiKey: string, forceMock: boolean) {
  const metadata = getSyncMetadata(market);
  const symbol = metadata.symbol || market.symbol;
  const targetPrice = metadata.targetPrice || market.target_price;

  if (!symbol) {
    return {
      shouldUpdate: false,
      reason: 'missing_stock_symbol',
      metadataUsed: metadata,
    };
  }

  if (forceMock) {
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'force_mock_enabled',
      metadataUsed: metadata,
    };
  }

  try {
    const response = await fetch(
      `https://app-bd0xcwu4joqp-api-oYA6Z8wDBN1a.gateway.appmedo.com/v1/data/quote?symbols=${symbol}`,
      {
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Stock API error: ${response.status}`);
    }

    const result = await response.json();
    const stockData = result.data?.[0];

    if (!stockData || !stockData.price) {
      throw new Error('No stock data returned');
    }

    const currentPrice = stockData.price;
    let yesPrice = 50;
    let reason = 'stock_api_success';

    if (targetPrice) {
      const distancePct = ((currentPrice - targetPrice) / targetPrice) * 100;
      yesPrice = clamp(Math.round(50 + distancePct * 5), 1, 99);
    } else {
      // No target, use small random movement
      const drift = Math.round((Math.random() - 0.5) * 3);
      yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
      reason = 'missing_target_price_using_drift';
    }

    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: false,
      reason,
      metadataUsed: metadata,
      externalDataSummary: { symbol, currentPrice, targetPrice },
    };
  } catch (err) {
    // Fallback to mock
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'stock_api_failed_using_mock',
      error: err instanceof Error ? err.message : String(err),
      metadataUsed: metadata,
    };
  }
}

async function syncForexMarket(market: any, apiKey: string, forceMock: boolean) {
  const metadata = getSyncMetadata(market);
  const base = metadata.base || market.base_currency || 'USD';
  const quote = metadata.quote || market.quote_currency || 'IDR';
  const targetRate = metadata.targetRate || market.target_rate;

  if (!base || !quote) {
    return {
      shouldUpdate: false,
      reason: 'missing_forex_pair',
      metadataUsed: metadata,
    };
  }

  if (forceMock) {
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'force_mock_enabled',
      metadataUsed: metadata,
    };
  }

  try {
    const response = await fetch(
      `https://app-bd0xcwu4joqp-api-w9Rbo8E7p2b9.gateway.appmedo.com/v6/8192723d20263507156f9754/latest/${base}`,
      {
        headers: {
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Forex API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== 'success' || !data.conversion_rates) {
      throw new Error('Invalid forex response');
    }

    const currentRate = data.conversion_rates[quote];

    if (!currentRate) {
      throw new Error(`No rate for ${quote}`);
    }

    let yesPrice = 50;
    let reason = 'forex_api_success';

    if (targetRate) {
      const distancePct = ((currentRate - targetRate) / targetRate) * 100;
      yesPrice = clamp(Math.round(50 + distancePct * 10), 1, 99);
    } else {
      // No target, use small random movement
      const drift = Math.round((Math.random() - 0.5) * 3);
      yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
      reason = 'missing_target_rate_using_drift';
    }

    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: false,
      reason,
      metadataUsed: metadata,
      externalDataSummary: { base, quote, currentRate, targetRate },
    };
  } catch (err) {
    // Fallback to mock
    const drift = Math.round((Math.random() - 0.5) * 4);
    const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: true,
      reason: 'forex_api_failed_using_mock',
      error: err instanceof Error ? err.message : String(err),
      metadataUsed: metadata,
    };
  }
}

async function syncGenericMarket(market: any) {
  // Generic markets get small random movement
  const drift = Math.round((Math.random() - 0.5) * 4);
  const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
  const history = normalizeHistory(market.history);
  history.push({ t: Date.now(), y: yesPrice });

  return {
    shouldUpdate: true,
    yesPrice,
    history: history.slice(-50),
    isMock: true,
    reason: 'generic_market_mock_movement',
    metadataUsed: {},
  };
}

async function syncCryptoMarket(market: any) {
  const metadata = getSyncMetadata(market);
  const symbol = metadata.symbol || market.symbol;

  if (!symbol) {
    return {
      shouldUpdate: false,
      reason: 'missing_crypto_symbol',
      metadataUsed: metadata,
    };
  }

  // Crypto API not configured yet, use mock
  const drift = Math.round((Math.random() - 0.5) * 5);
  const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
  const history = normalizeHistory(market.history);
  history.push({ t: Date.now(), y: yesPrice });

  return {
    shouldUpdate: true,
    yesPrice,
    history: history.slice(-50),
    isMock: true,
    reason: 'crypto_api_not_configured_using_mock',
    metadataUsed: metadata,
  };
}

async function syncSportsMarket(market: any) {
  const metadata = getSyncMetadata(market);

  if (!metadata.sport && !metadata.team && !metadata.event) {
    return {
      shouldUpdate: false,
      reason: 'missing_sports_metadata',
      metadataUsed: metadata,
    };
  }

  // Sports API not configured yet, use mock
  const drift = Math.round((Math.random() - 0.5) * 6);
  const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
  const history = normalizeHistory(market.history);
  history.push({ t: Date.now(), y: yesPrice });

  return {
    shouldUpdate: true,
    yesPrice,
    history: history.slice(-50),
    isMock: true,
    reason: 'sports_api_not_configured_using_mock',
    metadataUsed: metadata,
  };
}

async function syncNewsDrivenMarket(market: any, _apiKey: string, category: string) {
  const metadata = getSyncMetadata(market);

  // News-driven markets (Politics, Entertainment, Business, Esports)
  // Could use News API for sentiment analysis, but not implemented yet
  const drift = Math.round((Math.random() - 0.5) * 4);
  const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
  const history = normalizeHistory(market.history);
  history.push({ t: Date.now(), y: yesPrice });

  return {
    shouldUpdate: true,
    yesPrice,
    history: history.slice(-50),
    isMock: true,
    reason: `${category}_news_driven_market_using_mock`,
    metadataUsed: metadata,
  };
}

async function syncCommunityMarket(market: any) {
  const metadata = getSyncMetadata(market);

  // Community markets don't sync from external sources
  if (!metadata.syncSource) {
    return {
      shouldUpdate: false,
      reason: 'community_market_no_sync_source',
      metadataUsed: metadata,
    };
  }

  // If sync source is defined, use mock movement
  const drift = Math.round((Math.random() - 0.5) * 3);
  const yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
  const history = normalizeHistory(market.history);
  history.push({ t: Date.now(), y: yesPrice });

  return {
    shouldUpdate: true,
    yesPrice,
    history: history.slice(-50),
    isMock: true,
    reason: 'community_market_mock_movement',
    metadataUsed: metadata,
  };
}

async function syncSingleMarket(market: any, apiKey: string, forceMock: boolean) {
  const category = normalizeCategory(market.category);

  switch (category) {
    case 'weather':
      return await syncWeatherMarket(market, apiKey, forceMock);

    case 'stocks':
    case 'stock':
      return await syncStockMarket(market, apiKey, forceMock);

    case 'forex':
      return await syncForexMarket(market, apiKey, forceMock);

    case 'crypto':
      return await syncCryptoMarket(market);

    case 'sports':
      return await syncSportsMarket(market);

    case 'politics':
      return await syncNewsDrivenMarket(market, apiKey, 'politics');

    case 'entertainment':
      return await syncNewsDrivenMarket(market, apiKey, 'entertainment');

    case 'business':
      return await syncNewsDrivenMarket(market, apiKey, 'business');

    case 'esports':
      return await syncNewsDrivenMarket(market, apiKey, 'esports');

    case 'community':
      return await syncCommunityMarket(market);

    default:
      return await syncGenericMarket(market);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const runId = crypto.randomUUID();

  try {
    // Parse request body
    const body: SyncOptions = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    
    const {
      source = 'unknown',
      maxMarkets = 50,
      marketId,
      category,
      dryRun = false,
      includeDetails = true,
      forceMock = false,
      skipRecentlySyncedSeconds,
    } = body;

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({
        success: false,
        error: 'Missing Supabase configuration',
      }, 500);
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Build query
    let query = supabaseAdmin.from('markets').select('*');

    if (marketId) {
      query = query.eq('id', marketId);
    } else {
      query = query.eq('status', 'live');
      
      if (category) {
        query = query.eq('category', category);
      }
      
      if (skipRecentlySyncedSeconds) {
        const cutoff = new Date(Date.now() - skipRecentlySyncedSeconds * 1000).toISOString();
        query = query.or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);
      }
      
      query = query.limit(maxMarkets);
    }

    // Fetch markets
    const { data: markets, error: fetchError } = await query;

    if (fetchError) {
      return jsonResponse({
        success: false,
        error: `Failed to fetch markets: ${fetchError.message}`,
      }, 500);
    }

    const results: MarketResult[] = [];
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    let mockUpdated = 0;
    let liveUpdated = 0;

    for (const market of markets ?? []) {
      const oldYesPrice = market.yes_price;
      const oldHistory = normalizeHistory(market.history);

      try {
        const syncResult = await syncSingleMarket(market, apiKey || '', forceMock);
        const syncHandler = normalizeCategory(market.category);

        if (!syncResult.shouldUpdate) {
          skipped++;
          results.push(createMarketResult({
            market,
            status: 'skipped',
            syncHandler,
            oldYesPrice,
            oldHistory,
            reason: syncResult.reason,
            metadataUsed: syncResult.metadataUsed,
          }));
          continue;
        }

        const newYesPrice = syncResult.yesPrice;
        const newNoPrice = 100 - newYesPrice;
        const newHistory = syncResult.history;

        const updatePayload: Record<string, unknown> = {
          yes_price: newYesPrice,
          no_price: newNoPrice,
          history: newHistory,
          data_status: syncResult.isMock ? 'mock' : 'live',
          last_synced_at: new Date().toISOString(),
          sync_error: syncResult.error || null,
        };

        if (!dryRun) {
          const { error: updateError } = await supabaseAdmin
            .from('markets')
            .update(updatePayload)
            .eq('id', market.id);

          if (updateError) {
            throw new Error(`DB update failed: ${updateError.message}`);
          }
        }

        updated++;
        if (syncResult.isMock) {
          mockUpdated++;
        } else {
          liveUpdated++;
        }

        results.push(createMarketResult({
          market,
          status: 'updated',
          syncHandler,
          oldYesPrice,
          newYesPrice,
          oldHistory,
          newHistory,
          usedMock: syncResult.isMock,
          reason: syncResult.reason,
          metadataUsed: syncResult.metadataUsed,
          updatePayload: includeDetails ? updatePayload : undefined,
        }));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        failed++;

        if (!dryRun) {
          await supabaseAdmin
            .from('markets')
            .update({
              data_status: 'failed',
              last_synced_at: new Date().toISOString(),
              sync_error: errorMsg,
            })
            .eq('id', market.id);
        }

        results.push(createMarketResult({
          market,
          status: 'failed',
          syncHandler: normalizeCategory(market.category),
          oldYesPrice,
          oldHistory,
          error: errorMsg,
          metadataUsed: getSyncMetadata(market),
        }));
      }
    }

    const finishTime = Date.now();
    const durationMs = finishTime - startTime;

    // Log sync run
    if (!dryRun) {
      await supabaseAdmin.from('market_sync_runs').insert({
        source,
        dry_run: dryRun,
        started_at: new Date(startTime).toISOString(),
        finished_at: new Date(finishTime).toISOString(),
        duration_ms: durationMs,
        total_fetched: markets?.length ?? 0,
        attempted: (markets?.length ?? 0),
        updated,
        skipped,
        failed,
        mock_updated: mockUpdated,
        live_updated: liveUpdated,
        details: includeDetails ? { results } : { summary: { updated, skipped, failed } },
      });
    }

    return jsonResponse({
      success: true,
      run: {
        runId,
        source,
        dryRun,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date(finishTime).toISOString(),
        durationMs,
      },
      summary: {
        totalFetched: markets?.length ?? 0,
        attempted: markets?.length ?? 0,
        updated,
        skipped,
        failed,
        mockUpdated,
        liveUpdated,
      },
      results: includeDetails ? results : results.map(r => ({
        id: r.id,
        title: r.title,
        category: r.category,
        status: r.status,
        reason: r.reason,
        error: r.error,
      })),
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
      run: {
        runId,
        startedAt: new Date(startTime).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      },
    }, 500);
  }
});
