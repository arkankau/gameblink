import { useEffect } from 'react';
import { supabase } from '@/db/supabase';

/**
 * Hook to subscribe to realtime market updates
 * Triggers a callback when markets table changes
 */
export function useRealtimeMarkets(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('market-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'markets' },
        (payload) => {
          console.log('Market update received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}

/**
 * Hook to subscribe to a specific market's updates
 */
export function useRealtimeMarket(marketId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!marketId) return;

    const channel = supabase
      .channel(`market-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'markets',
          filter: `id=eq.${marketId}`,
        },
        (payload) => {
          console.log('Market detail update received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId, onUpdate]);
}
