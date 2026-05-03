import { useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to track user online status
 * Updates last_active_at every 60 seconds while app is open
 */
export function useOnlineStatus() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || user.is_guest) return;

    // Update immediately on mount
    updateLastActive();

    // Update every 60 seconds
    const interval = setInterval(() => {
      updateLastActive();
    }, 60000); // 60 seconds

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  const updateLastActive = async () => {
    if (!user || user.is_guest) return;

    try {
      await supabase
        .from('users')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch (err) {
      console.error('Failed to update last_active_at:', err);
    }
  };

  // Return function to manually update (for important actions)
  return { updateLastActive };
}

/**
 * Check if a user is online (active within last 15 minutes)
 */
export function isUserOnline(lastActiveAt: string | null | undefined): boolean {
  if (!lastActiveAt) return false;

  const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
  const lastActive = new Date(lastActiveAt).getTime();

  return lastActive > fifteenMinutesAgo;
}
