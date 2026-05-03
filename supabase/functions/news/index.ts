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

function generateMockNews(query: string) {
  const topics = ['Bitcoin', 'Ethereum', 'Stock Market', 'Economy', 'Technology', 'Sports', 'Politics'];
  const sources = ['Reuters', 'Bloomberg', 'CNBC', 'TechCrunch', 'The Verge', 'ESPN'];
  
  const articles = [];
  const numArticles = 3 + Math.floor(Math.random() * 3); // 3-5 articles

  for (let i = 0; i < numArticles; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const source = sources[Math.floor(Math.random() * sources.length)];
    const hoursAgo = Math.floor(Math.random() * 24);
    
    articles.push({
      title: `${topic} Market Analysis: ${query} - Latest Updates`,
      source,
      url: `https://example.com/article-${i}`,
      publishedAt: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
      summary: `Mock article about ${query}. This is fallback data generated when the news API is unavailable. In production, this would contain real news content from ${source}.`,
      imageUrl: null,
    });
  }

  return articles;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get query from body
    const body = await req.json();
    const { query, marketId } = body;

    if (!query) {
      return jsonResponse({
        success: false,
        error: 'Query parameter is required',
      }, 400);
    }

    // Try to fetch real news data
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    let articles;
    let source = 'mock-fallback';
    let isMock = true;
    let error;

    // Placeholder for real API call
    // if (apiKey) {
    //   try {
    //     const response = await fetch(
    //       `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=5&apiKey=${apiKey}`
    //     );
    //     if (response.ok) {
    //       const data = await response.json();
    //       articles = data.articles.map((article: any) => ({
    //         title: article.title,
    //         source: article.source.name,
    //         url: article.url,
    //         publishedAt: article.publishedAt,
    //         summary: article.description || article.content?.substring(0, 200),
    //         imageUrl: article.urlToImage,
    //       }));
    //       source = 'news-api';
    //       isMock = false;
    //     }
    //   } catch (err) {
    //     error = err.message;
    //   }
    // }

    // Use mock fallback
    if (!articles) {
      articles = generateMockNews(query);
      error = apiKey ? 'News API unavailable, using mock data' : 'No API key configured, using mock data';
    }

    return jsonResponse({
      success: true,
      source,
      isMock,
      lastSyncedAt: new Date().toISOString(),
      data: {
        articles,
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
