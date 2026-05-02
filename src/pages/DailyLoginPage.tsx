import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DailyStreak } from '@/types/types';
import { Flame } from 'lucide-react';

const REWARDS = [100, 150, 200, 250, 300, 350, 1000];

export default function DailyLoginPage() {
  const { user, refreshUser } = useAuth();
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStreak();
    }
  }, [user]);

  const fetchStreak = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('daily_streaks')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching streak:', error);
      return;
    }

    if (!data) {
      const { data: newStreak } = await supabase
        .from('daily_streaks')
        .insert({ user_id: user.id, streak: 0 })
        .select()
        .single();

      if (newStreak) {
        setStreak(newStreak);
        setCanClaim(true);
      }
    } else {
      setStreak(data);

      const today = new Date().toISOString().split('T')[0];
      const lastClaim = data.last_claim_date;

      if (!lastClaim) {
        setCanClaim(true);
      } else if (lastClaim !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastClaim === yesterdayStr) {
          setCanClaim(true);
        } else if (lastClaim < yesterdayStr) {
          await supabase
            .from('daily_streaks')
            .update({ streak: 0 })
            .eq('user_id', user.id);

          setStreak({ ...data, streak: 0 });
          setCanClaim(true);
        }
      }
    }
  };

  const handleClaim = async () => {
    if (!user || !streak || !canClaim) return;

    setLoading(true);

    try {
      const currentStreak = streak.streak;
      const reward = REWARDS[currentStreak] || REWARDS[0];
      const newStreak = currentStreak >= 6 ? 0 : currentStreak + 1;
      const today = new Date().toISOString().split('T')[0];

      await supabase
        .from('daily_streaks')
        .update({
          streak: newStreak,
          last_claim_date: today,
          total_earned: streak.total_earned + reward,
        })
        .eq('user_id', user.id);

      await supabase
        .from('users')
        .update({ balance: user.balance + reward })
        .eq('id', user.id);

      toast.success(`Claimed ${reward} coins! 🔥`);
      setCanClaim(false);
      await refreshUser();
      fetchStreak();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to claim reward');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Please login to claim daily rewards</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl md:text-4xl">DAILY LOGIN</h1>
        <p className="mt-2 text-muted-foreground">Claim your daily rewards and build your streak</p>
      </div>

      <Card className="mb-6 p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Flame className={`h-24 w-24 ${canClaim ? 'gb-flame text-gb-hot' : 'text-muted-foreground'}`} />
        </div>

        <h2 className="mb-2 font-display text-2xl">
          Day {streak ? streak.streak + 1 : 1} Streak
        </h2>

        <p className="mb-6 text-4xl font-bold text-gb-coin">
          {streak ? REWARDS[streak.streak] || REWARDS[0] : REWARDS[0]} coins
        </p>

        <Button
          onClick={handleClaim}
          disabled={!canClaim || loading}
          size="lg"
          className="px-12"
        >
          {loading ? 'Claiming...' : canClaim ? 'Claim Reward' : 'Already Claimed Today'}
        </Button>

        {streak && streak.total_earned > 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            Total earned: {streak.total_earned.toLocaleString()} coins
          </p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-display text-xl">Reward Schedule</h3>
        <div className="grid gap-3 md:grid-cols-7">
          {REWARDS.map((reward, index) => {
            const isActive = streak && streak.streak === index;
            const isClaimed = streak && streak.streak > index;

            return (
              <div
                key={index}
                className={`rounded-lg border p-4 text-center ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : isClaimed
                      ? 'border-border bg-muted/50'
                      : 'border-border'
                }`}
              >
                <p className="mb-1 text-xs font-medium text-muted-foreground">Day {index + 1}</p>
                <p className="font-mono text-lg font-semibold text-gb-coin">{reward}</p>
                {isClaimed && <p className="mt-1 text-xs text-muted-foreground">✓</p>}
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Claim daily to maintain your streak. Miss a day and it resets!
        </p>
      </Card>
    </div>
  );
}
