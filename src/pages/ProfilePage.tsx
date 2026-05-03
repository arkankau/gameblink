import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Trophy, TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import type { Bet, Market } from '@/types/types';

interface BetWithMarket extends Bet {
  market: Market;
}

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [recentBets, setRecentBets] = useState<BetWithMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      fetchRecentBets();
    }
  }, [user, authLoading]);

  const fetchRecentBets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*, market:markets(*)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setRecentBets(data as unknown as BetWithMarket[]);
      }
    } catch (err) {
      console.error('Error fetching recent bets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const winRate = user.total_bets > 0 ? ((user.wins / user.total_bets) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="text-6xl">{user.avatar}</div>
              <div>
                <h1 className="font-display text-3xl md:text-4xl">{user.username}</h1>
                <p className="mt-1 text-muted-foreground">
                  {user.city}, {user.country}
                </p>
                {user.is_guest && (
                  <Badge variant="secondary" className="mt-2">
                    Guest Account
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Trophy className="h-4 w-4" />
              <span className="text-sm">Balance</span>
            </div>
            <div className="text-2xl font-semibold">{user.balance.toLocaleString()}¢</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-sm">Total Bets</span>
            </div>
            <div className="text-2xl font-semibold">{user.total_bets}</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Award className="h-4 w-4" />
              <span className="text-sm">Win Rate</span>
            </div>
            <div className="text-2xl font-semibold">{winRate}%</div>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              {user.pnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-gb-yes" />
              ) : (
                <TrendingDown className="h-4 w-4 text-gb-no" />
              )}
              <span className="text-sm">PnL</span>
            </div>
            <div className={`text-2xl font-semibold ${user.pnl >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
              {user.pnl >= 0 ? '+' : ''}{user.pnl.toLocaleString()}¢
            </div>
          </Card>
        </div>

        {/* Performance Stats */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Wins</div>
            <div className="text-3xl font-semibold text-gb-yes">{user.wins}</div>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Losses</div>
            <div className="text-3xl font-semibold text-gb-no">{user.losses}</div>
          </Card>

          <Card className="p-6">
            <div className="mb-2 text-sm text-muted-foreground">Weekly Gain</div>
            <div className={`text-3xl font-semibold ${user.weekly_gain >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
              {user.weekly_gain >= 0 ? '+' : ''}{user.weekly_gain.toLocaleString()}¢
            </div>
          </Card>
        </div>

        {/* Recent Bets */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent Bets</h2>
            <Button variant="outline" asChild>
              <Link to="/my-bets">View All</Link>
            </Button>
          </div>

          {recentBets.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="mb-4 text-muted-foreground">No bets yet</p>
              <Button asChild>
                <Link to="/">Browse Markets</Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentBets.map((bet) => (
                <Card key={bet.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <Link to={`/market/${bet.market_id}`} className="hover:underline">
                        <h3 className="font-semibold">{bet.market.title}</h3>
                      </Link>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={bet.side === 'yes' ? 'default' : 'secondary'}>
                          {bet.side.toUpperCase()}
                        </Badge>
                        <span>•</span>
                        <span>{bet.stake.toLocaleString()}¢ stake</span>
                        <span>•</span>
                        <span>@{bet.price_at_bet}¢</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {bet.potential_payout.toLocaleString()}¢ potential
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(bet.placed_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
