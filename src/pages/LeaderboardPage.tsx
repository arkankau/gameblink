import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/types';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

type Scope = 'worldwide' | 'country' | 'city' | 'friends';
type Timeframe = 'week' | 'month' | 'alltime';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('worldwide');
  const [timeframe, setTimeframe] = useState<Timeframe>('week');
  const [leaders, setLeaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, [scope, timeframe, user]);

  const fetchLeaderboard = async () => {
    setLoading(true);

    let query = supabase.from('users').select('*');

    if (scope === 'country' && user) {
      query = query.eq('country', user.country);
    } else if (scope === 'city' && user) {
      query = query.eq('city', user.city);
    } else if (scope === 'friends' && user) {
      const { data: friendData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendData) {
        const friendIds = friendData.map((f) => f.friend_id);
        query = query.in('id', friendIds);
      }
    }

    const sortField = timeframe === 'week' ? 'weekly_gain' : 'pnl';
    const { data } = await query.order(sortField, { ascending: false }).limit(50);

    if (data) setLeaders(data);
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">LEADERBOARD</h1>
        <p className="mt-2 text-muted-foreground">Top performers in the community</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant={scope === 'worldwide' ? 'default' : 'outline'}
            onClick={() => setScope('worldwide')}
            size="sm"
          >
            Worldwide
          </Button>
          <Button
            variant={scope === 'country' ? 'default' : 'outline'}
            onClick={() => setScope('country')}
            size="sm"
            disabled={!user}
          >
            Country
          </Button>
          <Button
            variant={scope === 'city' ? 'default' : 'outline'}
            onClick={() => setScope('city')}
            size="sm"
            disabled={!user}
          >
            City
          </Button>
          <Button
            variant={scope === 'friends' ? 'default' : 'outline'}
            onClick={() => setScope('friends')}
            size="sm"
            disabled={!user}
          >
            Friends
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={timeframe === 'week' ? 'default' : 'outline'}
            onClick={() => setTimeframe('week')}
            size="sm"
          >
            Week
          </Button>
          <Button
            variant={timeframe === 'month' ? 'default' : 'outline'}
            onClick={() => setTimeframe('month')}
            size="sm"
          >
            Month
          </Button>
          <Button
            variant={timeframe === 'alltime' ? 'default' : 'outline'}
            onClick={() => setTimeframe('alltime')}
            size="sm"
          >
            All Time
          </Button>
        </div>
      </div>

      {loading ? (
        <Card className="h-96 animate-pulse bg-muted" />
      ) : leaders.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          No data available for this scope
        </Card>
      ) : (
        <>
          {leaders.length >= 3 && (
            <div className="mb-8 grid gap-4 md:grid-cols-3">
              {[1, 0, 2].map((idx) => {
                const leader = leaders[idx];
                if (!leader) return null;
                const rank = idx + 1;
                const gain = timeframe === 'week' ? leader.weekly_gain : leader.pnl;

                return (
                  <Card
                    key={leader.id}
                    className={`p-6 text-center ${rank === 1 ? 'md:order-2 md:scale-105' : rank === 2 ? 'md:order-1' : 'md:order-3'}`}
                  >
                    <div className="mb-3 flex justify-center">
                      {rank === 1 && <Trophy className="h-12 w-12 text-gb-coin" />}
                      {rank === 2 && <Trophy className="h-10 w-10 text-muted-foreground" />}
                      {rank === 3 && <Trophy className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <span className="mb-2 block text-4xl">{leader.avatar}</span>
                    <h3 className="mb-1 font-display text-xl">{leader.username}</h3>
                    <p className="mb-2 text-xs text-muted-foreground">
                      {leader.city}, {leader.country}
                    </p>
                    <p className={`font-mono text-2xl ${gain >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                      {gain >= 0 ? '+' : ''}{gain.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {leader.wins}W / {leader.losses}L
                    </p>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="p-4">
            <div className="space-y-2">
              {leaders.map((leader, index) => {
                const gain = timeframe === 'week' ? leader.weekly_gain : leader.pnl;
                const isCurrentUser = user?.id === leader.id;

                return (
                  <div
                    key={leader.id}
                    className={`flex items-center justify-between rounded-lg border border-border p-3 ${isCurrentUser ? 'bg-primary/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-2xl">{leader.avatar}</span>
                      <div>
                        <p className="font-medium">{leader.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {leader.city}, {leader.country}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-mono font-semibold ${gain >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                        {gain >= 0 ? '+' : ''}{gain.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {leader.wins}W / {leader.losses}L
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
