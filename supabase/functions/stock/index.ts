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

const MOCK_STOCKS: Record<string, { name: string; basePrice: number }> = {
  AAPL: { name: 'Apple Inc.', basePrice: 175 },
  GOOGL: { name: 'Alphabet Inc.', basePrice: 140 },
  MSFT: { name: 'Microsoft Corporation', basePrice: 380 },
  AMZN: { name: 'Amazon.com Inc.', basePrice: 145 },
  TSLA: { name: 'Tesla Inc.', basePrice: 180 },
  META: { name: 'Meta Platforms Inc.', basePrice: 450 },
  NVDA: { name: 'NVIDIA Corporation', basePrice: 880 },
  NFLX: { name: 'Netflix Inc.', basePrice: 580 },
};

function generateMockStock(symbol: string) {
  const stock = MOCK_STOCKS[symbol.toUpperCase()];
  if (!stock) {
    return null;
  }

  const variation = (Math.random() - 0.5) * 20; // ±10
  const price = stock.basePrice + variation;
  const change = (Math.random() - 0.5) * 10; // ±5
  const changePercent = (change / price) * 100;

  return {
    symbol: symbol.toUpperCase(),
    companyName: stock.name,
    price: Math.round(price * 100) / 100,
    currency: 'USD',
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    marketTime: new Date().toISOString(),
    logo: null,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get symbol from query params or body
    const url = new URL(req.url);
    let symbol = url.searchParams.get('symbol');

    if (!symbol && req.method === 'POST') {
      const body = await req.json();
      symbol = body.symbol;
    }

    if (!symbol) {
      return jsonResponse({
        success: false,
        error: 'Symbol parameter is required',
      }, 400);
    }

    // Try to fetch real stock data
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    let stockData;
    let source = 'mock-fallback';
    let isMock = true;
    let error;

    // Placeholder for real API call
    // if (apiKey) {
    //   try {
    //     const response = await fetch(
    //       `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`
    //     );
    //     if (response.ok) {
    //       const data = await response.json();
    //       const quote = data['Global Quote'];
    //       if (quote) {
    //         stockData = {
    //           symbol: quote['01. symbol'],
    //           companyName: quote['01. symbol'],
    //           price: parseFloat(quote['05. price']),
    //           currency: 'USD',
    //           change: parseFloat(quote['09. change']),
    //           changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    //           marketTime: quote['07. latest trading day'],
    //           logo: null,
    //         };
    //         source = 'stock-api';
    //         isMock = false;
    //       }
    //     }
    //   } catch (err) {
    //     error = err.message;
    //   }
    // }

    // Use mock fallback
    if (!stockData) {
      stockData = generateMockStock(symbol);
      if (!stockData) {
        return jsonResponse({
          success: false,
          error: `Unsupported stock symbol: ${symbol}. Try AAPL, GOOGL, MSFT, AMZN, TSLA, META, NVDA, or NFLX.`,
        }, 400);
      }
      error = apiKey ? 'Stock API unavailable, using mock data' : 'No API key configured, using mock data';
    }

    return jsonResponse({
      success: true,
      source,
      isMock,
      lastSyncedAt: new Date().toISOString(),
      data: stockData,
      error,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message || 'Internal server error',
    }, 500);
  }
});
