import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import type { Market } from '@/types/types';

export function MarketTicker() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);

  useEffect(() => {
    fetchHotMarkets();
  }, []);

  const fetchHotMarkets = async () => {
    // Try to get hot/trending markets first
    let { data } = await supabase
      .from('markets')
      .select('*')
      .eq('hot', true)
      .eq('status', 'live')
      .limit(10);

    // Fallback to top volume markets if no hot markets
    if (!data || data.length === 0) {
      const result = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'live')
        .order('volume', { ascending: false })
        .limit(10);
      data = result.data;
    }

    if (data) {
      // Duplicate the array for seamless looping
      setMarkets([...data, ...data]);
    }
  };

  if (markets.length === 0) return null;

  return (
    <div className="relative overflow-hidden border-y border-border bg-card/50 py-3">
      <div className="gb-ticker flex gap-8 whitespace-nowrap hover:[animation-play-state:paused]">
        {markets.map((market, index) => (
          <button
            key={`${market.id}-${index}`}
            onClick={() => navigate(`/market/${market.id}`)}
            className="inline-flex items-center gap-3 transition-colors hover:text-primary"
          >
            <span className="text-lg">{market.icon}</span>
            <span className="font-mono text-sm font-medium">{market.title}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="font-mono text-xs text-gb-yes">YES {market.yes_price}¢</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="font-mono text-xs text-gb-no">NO {market.no_price}¢</span>
            {market.hot && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs">🔥 HOT</span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
