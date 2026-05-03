import { useEffect } from 'react';
import { supabase } from '@/db/supabase';

/**
 * Hook to subscribe to realtime comment updates for a market
 */
export function useRealtimeComments(marketId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!marketId) return;

    const channel = supabase
      .channel(`comments-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          console.log('Comment update received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId, onUpdate]);
}

/**
 * Hook to subscribe to realtime bet updates for a market (activity feed)
 */
export function useRealtimeBets(marketId: string | undefined, onUpdate: () => void) {
  useEffect(() => {
    if (!marketId) return;

    const channel = supabase
      .channel(`bets-${marketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bets',
          filter: `market_id=eq.${marketId}`,
        },
        (payload) => {
          console.log('New bet received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId, onUpdate]);
}

/**
 * Hook to subscribe to all bet updates (for leaderboard)
 */
export function useRealtimeAllBets(onUpdate: () => void) {
  useEffect(() => {
    const channel = supabase
      .channel('all-bets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
        },
        (payload) => {
          console.log('Bet update received:', payload);
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onUpdate]);
}
