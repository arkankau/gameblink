// Shared CORS headers for all Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

// Indonesian cities supported
export const INDONESIAN_CITIES = [
  'Jakarta',
  'Tangerang',
  'Bandung',
  'Surabaya',
  'Bali',
  'Medan',
  'Semarang',
  'Makassar',
  'Palembang',
  'Yogyakarta',
];

// Weather conditions with icons
const WEATHER_CONDITIONS = [
  { condition: 'Sunny', icon: '☀️' },
  { condition: 'Partly Cloudy', icon: '⛅' },
  { condition: 'Cloudy', icon: '☁️' },
  { condition: 'Rainy', icon: '🌧️' },
  { condition: 'Thunderstorm', icon: '⛈️' },
  { condition: 'Light Rain', icon: '🌦️' },
];

function generateMockWeather(city: string) {
  const randomCondition = WEATHER_CONDITIONS[Math.floor(Math.random() * WEATHER_CONDITIONS.length)];
  const baseTemp = 26 + Math.floor(Math.random() * 8); // 26-34°C typical for Indonesia
  const precipProb = randomCondition.condition.includes('Rain') || randomCondition.condition.includes('Thunder')
    ? 60 + Math.floor(Math.random() * 40)
    : Math.floor(Math.random() * 30);

  return {
    city,
    countryCode: 'ID',
    temperatureC: baseTemp,
    condition: randomCondition.condition,
    precipitationProbability: precipProb,
    humidity: 70 + Math.floor(Math.random() * 25),
    windKph: 5 + Math.floor(Math.random() * 20),
    forecastSummary: `${randomCondition.condition} with ${precipProb}% chance of rain. Temperature around ${baseTemp}°C.`,
    icon: randomCondition.icon,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get city from query params or body
    const url = new URL(req.url);
    let city = url.searchParams.get('city');

    if (!city && req.method === 'POST') {
      const body = await req.json();
      city = body.city;
    }

    if (!city) {
      return jsonResponse({
        success: false,
        error: 'City parameter is required',
      }, 400);
    }

    // Validate city
    if (!INDONESIAN_CITIES.includes(city)) {
      return jsonResponse({
        success: false,
        error: `Unsupported city. Supported cities: ${INDONESIAN_CITIES.join(', ')}`,
      }, 400);
    }

    // Try to fetch real weather data
    // For now, we'll use mock data as fallback
    // In production, you would call a real weather API here using INTEGRATIONS_API_KEY
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    let weatherData;
    let source = 'mock-fallback';
    let isMock = true;
    let error;

    // Placeholder for real API call
    // if (apiKey) {
    //   try {
    //     const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`);
    //     if (response.ok) {
    //       const data = await response.json();
    //       weatherData = {
    //         city: data.location.name,
    //         countryCode: data.location.country,
    //         temperatureC: data.current.temp_c,
    //         condition: data.current.condition.text,
    //         precipitationProbability: data.current.precip_mm > 0 ? 80 : 20,
    //         humidity: data.current.humidity,
    //         windKph: data.current.wind_kph,
    //         forecastSummary: `${data.current.condition.text}. Temperature ${data.current.temp_c}°C.`,
    //         icon: '🌤️',
    //       };
    //       source = 'weather-api';
    //       isMock = false;
    //     }
    //   } catch (err) {
    //     error = err.message;
    //   }
    // }

    // Use mock fallback
    if (!weatherData) {
      weatherData = generateMockWeather(city);
      error = apiKey ? 'Weather API unavailable, using mock data' : 'No API key configured, using mock data';
    }

    return jsonResponse({
      success: true,
      source,
      isMock,
      lastSyncedAt: new Date().toISOString(),
      data: weatherData,
      error,
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err.message || 'Internal server error',
    }, 500);
  }
});
