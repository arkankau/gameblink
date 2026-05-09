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

async function syncWeatherMarket(market: any, apiKey: string) {
  const metadata = market.sync_metadata || {};
  const city = metadata.city || market.city;

  if (!city || !CITY_COORDS[city]) {
    return {
      shouldUpdate: false,
      error: `No coordinates for city: ${city}`,
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
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function syncStockMarket(market: any, apiKey: string) {
  const metadata = market.sync_metadata || {};
  const symbol = metadata.symbol || market.symbol;
  const targetPrice = metadata.targetPrice || market.target_price;

  if (!symbol) {
    return {
      shouldUpdate: false,
      error: 'No stock symbol provided',
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

    if (targetPrice) {
      const distancePct = ((currentPrice - targetPrice) / targetPrice) * 100;
      yesPrice = clamp(Math.round(50 + distancePct * 5), 1, 99);
    } else {
      // No target, use small random movement
      const drift = Math.round((Math.random() - 0.5) * 3);
      yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    }

    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: false,
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
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function syncForexMarket(market: any, apiKey: string) {
  const metadata = market.sync_metadata || {};
  const base = metadata.base || market.base_currency || 'USD';
  const quote = metadata.quote || market.quote_currency || 'IDR';
  const targetRate = metadata.targetRate || market.target_rate;

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

    if (targetRate) {
      const distancePct = ((currentRate - targetRate) / targetRate) * 100;
      yesPrice = clamp(Math.round(50 + distancePct * 10), 1, 99);
    } else {
      // No target, use small random movement
      const drift = Math.round((Math.random() - 0.5) * 3);
      yesPrice = clamp((market.yes_price ?? 50) + drift, 1, 99);
    }

    const history = normalizeHistory(market.history);
    history.push({ t: Date.now(), y: yesPrice });

    return {
      shouldUpdate: true,
      yesPrice,
      history: history.slice(-50),
      isMock: false,
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
      error: err instanceof Error ? err.message : String(err),
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
  };
}

async function syncSingleMarket(market: any, apiKey: string) {
  const category = market.category;

  switch (category) {
    case 'Weather':
      return await syncWeatherMarket(market, apiKey);

    case 'Stocks':
      return await syncStockMarket(market, apiKey);

    case 'Forex':
      return await syncForexMarket(market, apiKey);

    case 'Crypto':
    case 'Sports':
    case 'Politics':
    case 'Entertainment':
    case 'Business':
    case 'Esports':
    case 'Community':
    default:
      return await syncGenericMarket(market);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Fetch live markets
    const { data: markets, error: fetchError } = await supabaseAdmin
      .from('markets')
      .select('*')
      .eq('status', 'live');

    if (fetchError) {
      return jsonResponse({
        success: false,
        error: `Failed to fetch markets: ${fetchError.message}`,
      }, 500);
    }

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const market of markets ?? []) {
      try {
        const syncResult = await syncSingleMarket(market, apiKey || '');

        if (!syncResult.shouldUpdate) {
          skipped++;
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from('markets')
          .update({
            yes_price: syncResult.yesPrice,
            no_price: 100 - syncResult.yesPrice,
            history: syncResult.history,
            data_status: syncResult.isMock ? 'mock' : 'live',
            last_synced_at: new Date().toISOString(),
            sync_error: syncResult.error || null,
          })
          .eq('id', market.id);

        if (updateError) {
          throw updateError;
        }

        updated++;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push({ id: market.id, error: errorMsg });

        await supabaseAdmin
          .from('markets')
          .update({
            data_status: 'failed',
            last_synced_at: new Date().toISOString(),
            sync_error: errorMsg,
          })
          .eq('id', market.id);

        failed++;
      }
    }

    return jsonResponse({
      success: true,
      summary: {
        total: markets?.length ?? 0,
        updated,
        skipped,
        failed,
        timestamp: new Date().toISOString(),
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    }, 500);
  }
});
