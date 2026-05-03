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

function generateFallbackHistory(currentPrice: number, points = 50) {
  const now = Date.now();
  const data: Array<{ t: number; y: number }> = [];

  const safeCurrentPrice = Number.isFinite(currentPrice)
    ? Math.max(0, Math.min(100, currentPrice))
    : 50;

  const startPrice = Math.max(
    20,
    Math.min(80, safeCurrentPrice + (Math.random() - 0.5) * 20)
  );

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const time = now - (points - i) * 3_600_000; // 1 hour intervals
    const price =
      startPrice +
      (safeCurrentPrice - startPrice) * progress +
      (Math.random() - 0.5) * 5;

    data.push({
      t: time,
      y: Math.max(0, Math.min(100, Math.round(price))),
    });
  }

  return data;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get parameters from body
    const body = await req.json();
    const { type, symbol, base, quote, marketId, currentPrice, points = 50 } = body;

    if (!type) {
      return jsonResponse({
        success: false,
        error: 'Type parameter is required (market, stock, forex, weather)',
      }, 400);
    }

    let historyData;
    let source = 'generated-fallback';
    let isMock = true;
    let error;

    // Try to fetch real historical data based on type
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');

    // Placeholder for real API calls
    // if (type === 'stock' && symbol && apiKey) {
    //   try {
    //     const response = await fetch(
    //       `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=60min&apikey=${apiKey}`
    //     );
    //     if (response.ok) {
    //       const data = await response.json();
    //       const timeSeries = data['Time Series (60min)'];
    //       if (timeSeries) {
    //         historyData = Object.entries(timeSeries)
    //           .slice(0, points)
    //           .map(([time, values]: [string, any]) => ({
    //             t: new Date(time).getTime(),
    //             y: parseFloat(values['4. close']),
    //           }))
    //           .reverse();
    //         source = 'historical-api';
    //         isMock = false;
    //       }
    //     }
    //   } catch (err) {
    //     error = err.message;
    //   }
    // }

    // Use generated fallback
    if (!historyData) {
      const price = currentPrice ?? 50;
      historyData = generateFallbackHistory(price, points);
      error = apiKey
        ? 'Historical data API unavailable, using generated fallback'
        : 'No API key configured, using generated fallback';
    }

    return jsonResponse({
      success: true,
      source,
      isMock,
      lastSyncedAt: new Date().toISOString(),
      data: {
        history: historyData,
      },
      error,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message || 'Internal server error',
    }, 500);
  }
});
