// Shared CORS headers
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

const MOCK_FOREX_RATES: Record<string, number> = {
  'USD/IDR': 15800,
  'EUR/USD': 1.08,
  'GBP/USD': 1.26,
  'USD/JPY': 149,
  'SGD/IDR': 11700,
  'EUR/IDR': 17100,
  'JPY/IDR': 106,
  'AUD/USD': 0.65,
  'USD/SGD': 1.35,
};

function generateMockForex(base: string, quote: string) {
  const pair = `${base}/${quote}`;
  const reversePair = `${quote}/${base}`;
  
  let rate = MOCK_FOREX_RATES[pair];
  
  // Try reverse pair
  if (!rate && MOCK_FOREX_RATES[reversePair]) {
    rate = 1 / MOCK_FOREX_RATES[reversePair];
  }
  
  if (!rate) {
    return null;
  }

  // Add small random variation
  const variation = (Math.random() - 0.5) * 0.02; // ±1%
  rate = rate * (1 + variation);
  
  const change = (Math.random() - 0.5) * (rate * 0.01); // ±0.5%
  const changePercent = (change / rate) * 100;

  return {
    base,
    quote,
    pair,
    rate: Math.round(rate * 10000) / 10000,
    change: Math.round(change * 10000) / 10000,
    changePercent: Math.round(changePercent * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get base and quote from body
    const body = await req.json();
    const { base, quote } = body;

    if (!base || !quote) {
      return jsonResponse({
        success: false,
        error: 'Base and quote parameters are required',
      }, 400);
    }

    // Try to fetch real forex data
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    let forexData;
    let source = 'mock-fallback';
    let isMock = true;
    let error;

    // Placeholder for real API call
    // if (apiKey) {
    //   try {
    //     const response = await fetch(
    //       `https://api.exchangerate-api.com/v4/latest/${base}`
    //     );
    //     if (response.ok) {
    //       const data = await response.json();
    //       if (data.rates[quote]) {
    //         forexData = {
    //           base,
    //           quote,
    //           pair: `${base}/${quote}`,
    //           rate: data.rates[quote],
    //           change: 0,
    //           changePercent: 0,
    //           timestamp: new Date(data.time_last_updated * 1000).toISOString(),
    //         };
    //         source = 'forex-api';
    //         isMock = false;
    //       }
    //     }
    //   } catch (err) {
    //     error = err.message;
    //   }
    // }

    // Use mock fallback
    if (!forexData) {
      forexData = generateMockForex(base, quote);
      if (!forexData) {
        return jsonResponse({
          success: false,
          error: `Unsupported forex pair: ${base}/${quote}. Try USD/IDR, EUR/USD, SGD/IDR, etc.`,
        }, 400);
      }
      error = apiKey ? 'Forex API unavailable, using mock data' : 'No API key configured, using mock data';
    }

    return jsonResponse({
      success: true,
      source,
      isMock,
      lastSyncedAt: new Date().toISOString(),
      data: forexData,
      error,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message || 'Internal server error',
    }, 500);
  }
});
