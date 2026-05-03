import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types/types';
import { Trophy, TrendingUp, TrendingDown, Medal, Award, Crown } from 'lucide-react';

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
            <div className="mb-8 grid grid-cols-3 gap-4">
              {/* Rank 2 - Left */}
              <Card className="mt-8 p-4 text-center">
                <div className="mb-2 flex justify-center">
                  <Medal className="h-14 w-14 text-muted-foreground" />
                </div>
                <div className="mb-2 text-4xl font-bold text-muted-foreground">2</div>
                <div className="mb-2 text-4xl">{leaders[1].avatar}</div>
                <h3 className="mb-1 font-display text-lg font-semibold">{leaders[1].username}</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  {leaders[1].city}, {leaders[1].country}
                </p>
                <p className={`font-mono text-xl font-semibold ${(timeframe === 'week' ? leaders[1].weekly_gain : leaders[1].pnl) >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                  {(timeframe === 'week' ? leaders[1].weekly_gain : leaders[1].pnl) >= 0 ? '+' : ''}
                  {(timeframe === 'week' ? leaders[1].weekly_gain : leaders[1].pnl).toLocaleString()}¢
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {leaders[1].wins}W / {leaders[1].losses}L
                </p>
              </Card>

              {/* Rank 1 - Center (Elevated) */}
              <Card className="relative border-2 border-primary p-6 text-center shadow-lg">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Crown className="h-8 w-8 text-primary" />
                </div>
                <div className="mb-3 flex justify-center">
                  <Trophy className="h-16 w-16 text-primary" />
                </div>
                <div className="mb-2 text-5xl font-bold text-primary">1</div>
                <div className="mb-3 text-5xl">{leaders[0].avatar}</div>
                <h3 className="mb-1 font-display text-xl font-bold">{leaders[0].username}</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  {leaders[0].city}, {leaders[0].country}
                </p>
                <p className={`font-mono text-2xl font-bold ${(timeframe === 'week' ? leaders[0].weekly_gain : leaders[0].pnl) >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                  {(timeframe === 'week' ? leaders[0].weekly_gain : leaders[0].pnl) >= 0 ? '+' : ''}
                  {(timeframe === 'week' ? leaders[0].weekly_gain : leaders[0].pnl).toLocaleString()}¢
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {leaders[0].wins}W / {leaders[0].losses}L
                </p>
              </Card>

              {/* Rank 3 - Right */}
              <Card className="mt-12 p-4 text-center">
                <div className="mb-2 flex justify-center">
                  <Award className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="mb-2 text-3xl font-bold text-muted-foreground">3</div>
                <div className="mb-2 text-3xl">{leaders[2].avatar}</div>
                <h3 className="mb-1 font-display font-semibold">{leaders[2].username}</h3>
                <p className="mb-2 text-xs text-muted-foreground">
                  {leaders[2].city}, {leaders[2].country}
                </p>
                <p className={`font-mono text-lg font-semibold ${(timeframe === 'week' ? leaders[2].weekly_gain : leaders[2].pnl) >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                  {(timeframe === 'week' ? leaders[2].weekly_gain : leaders[2].pnl) >= 0 ? '+' : ''}
                  {(timeframe === 'week' ? leaders[2].weekly_gain : leaders[2].pnl).toLocaleString()}¢
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {leaders[2].wins}W / {leaders[2].losses}L
                </p>
              </Card>
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
