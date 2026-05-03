import { supabase } from '@/db/supabase';

// Types for external data responses
export interface WeatherData {
  city: string;
  countryCode: string;
  temperatureC: number;
  condition: string;
  precipitationProbability: number;
  humidity?: number;
  windKph?: number;
  forecastSummary: string;
  icon: string;
}

export interface NewsArticle {
  title: string;
  source: string;
  url?: string;
  publishedAt?: string;
  summary: string;
  imageUrl?: string;
}

export interface StockData {
  symbol: string;
  companyName?: string;
  price: number;
  currency: string;
  change?: number;
  changePercent?: number;
  marketTime?: string;
  logo?: string;
}

export interface ForexData {
  base: string;
  quote: string;
  pair: string;
  rate: number;
  change?: number;
  changePercent?: number;
  timestamp?: string;
}

export interface HistoricalDataPoint {
  t: number;
  y: number;
}

export interface ExternalDataResponse<T> {
  success: boolean;
  source?: string;
  isMock?: boolean;
  lastSyncedAt?: string;
  data?: T;
  error?: string;
}

/**
 * Fetch weather data for a city
 */
export async function fetchWeather(city: string): Promise<ExternalDataResponse<WeatherData>> {
  try {
    const { data, error } = await supabase.functions.invoke('weather', {
      body: { city },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      console.error('Weather function error:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || 'Failed to fetch weather data',
      };
    }

    return data;
  } catch (err) {
    console.error('Weather fetch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch weather data',
    };
  }
}

/**
 * Fetch news articles for a query
 */
export async function fetchNews(
  query: string,
  marketId?: string
): Promise<ExternalDataResponse<{ articles: NewsArticle[] }>> {
  try {
    const { data, error } = await supabase.functions.invoke('news', {
      body: { query, marketId },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      console.error('News function error:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || 'Failed to fetch news',
      };
    }

    return data;
  } catch (err) {
    console.error('News fetch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch news',
    };
  }
}

/**
 * Fetch stock price data
 */
export async function fetchStock(symbol: string): Promise<ExternalDataResponse<StockData>> {
  try {
    const { data, error } = await supabase.functions.invoke('stock', {
      body: { symbol },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      console.error('Stock function error:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || 'Failed to fetch stock data',
      };
    }

    return data;
  } catch (err) {
    console.error('Stock fetch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch stock data',
    };
  }
}

/**
 * Fetch forex exchange rate
 */
export async function fetchForex(base: string, quote: string): Promise<ExternalDataResponse<ForexData>> {
  try {
    const { data, error } = await supabase.functions.invoke('forex', {
      body: { base, quote },
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      console.error('Forex function error:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || 'Failed to fetch forex data',
      };
    }

    return data;
  } catch (err) {
    console.error('Forex fetch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch forex data',
    };
  }
}

/**
 * Fetch historical data for charts
 */
export async function fetchHistoricalData(params: {
  type: 'market' | 'stock' | 'forex' | 'weather';
  symbol?: string;
  base?: string;
  quote?: string;
  marketId?: string;
  currentPrice?: number;
  points?: number;
}): Promise<ExternalDataResponse<{ history: HistoricalDataPoint[] }>> {
  try {
    const { data, error } = await supabase.functions.invoke('historical-data', {
      body: params,
    });

    if (error) {
      const errorMsg = await error?.context?.text?.();
      console.error('Historical data function error:', errorMsg || error?.message);
      return {
        success: false,
        error: errorMsg || error?.message || 'Failed to fetch historical data',
      };
    }

    return data;
  } catch (err) {
    console.error('Historical data fetch error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch historical data',
    };
  }
}
