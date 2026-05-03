import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Bet, Market } from '@/types/types';

interface BetWithMarket extends Bet {
  market: Market;
}

export default function MyBetsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bets, setBets] = useState<BetWithMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved' | 'won' | 'lost'>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/');
        return;
      }
      fetchBets();
    }
  }, [user, authLoading]);

  const fetchBets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*, market:markets(*)')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false });

      if (!error && data) {
        setBets(data as unknown as BetWithMarket[]);
      }
    } catch (err) {
      console.error('Error fetching bets:', err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading bets...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filteredBets = bets.filter((bet) => {
    if (filter === 'all') return true;
    if (filter === 'active') return bet.market.status === 'live' && !bet.outcome;
    if (filter === 'resolved') return bet.outcome !== null;
    if (filter === 'won') return bet.outcome === 'win';
    if (filter === 'lost') return bet.outcome === 'loss';
    return true;
  });

  const activeBets = bets.filter((b) => b.market.status === 'live' && !b.outcome);
  const resolvedBets = bets.filter((b) => b.outcome !== null);
  const wonBets = bets.filter((b) => b.outcome === 'win');
  const lostBets = bets.filter((b) => b.outcome === 'loss');

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl">My Bets</h1>
          <p className="mt-2 text-muted-foreground">Track all your predictions and outcomes</p>
        </div>

        {/* Stats Summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Total Bets</div>
            <div className="mt-1 text-2xl font-semibold">{bets.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Active</div>
            <div className="mt-1 text-2xl font-semibold">{activeBets.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Resolved</div>
            <div className="mt-1 text-2xl font-semibold">{resolvedBets.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Won</div>
            <div className="mt-1 text-2xl font-semibold text-gb-yes">{wonBets.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Lost</div>
            <div className="mt-1 text-2xl font-semibold text-gb-no">{lostBets.length}</div>
          </Card>
        </div>

        {/* Filters */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="won">Won</TabsTrigger>
            <TabsTrigger value="lost">Lost</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Bets List */}
        {filteredBets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="mb-4 text-muted-foreground">
              {filter === 'all' ? 'No bets yet' : `No ${filter} bets`}
            </p>
            {filter === 'all' && (
              <Button asChild>
                <Link to="/">Browse Markets</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBets.map((bet) => {
              const isActive = bet.market.status === 'live' && !bet.outcome;
              const isClosed = bet.market.status === 'closed' || new Date(bet.market.ends_at) <= new Date();
              const profit = bet.outcome === 'win' ? bet.potential_payout - bet.stake : bet.outcome === 'loss' ? -bet.stake : 0;

              return (
                <Card key={bet.id} className="p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex-1">
                      <Link to={`/market/${bet.market_id}`} className="hover:underline">
                        <h3 className="font-semibold">{bet.market.title}</h3>
                      </Link>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <Badge variant={bet.side === 'yes' ? 'default' : 'secondary'}>
                          {bet.side.toUpperCase()}
                        </Badge>
                        {bet.outcome && (
                          <Badge variant={bet.outcome === 'win' ? 'default' : 'secondary'}>
                            {bet.outcome === 'win' ? '✓ Won' : '✗ Lost'}
                          </Badge>
                        )}
                        {isActive && (
                          <Badge variant="outline">Active</Badge>
                        )}
                        {isClosed && !bet.outcome && (
                          <Badge variant="secondary">Pending Resolution</Badge>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>Stake: {bet.stake.toLocaleString()}¢</span>
                        <span>•</span>
                        <span>Price: {bet.price_at_bet}¢</span>
                        <span>•</span>
                        <span>Shares: {bet.shares}</span>
                        <span>•</span>
                        <span>Placed: {new Date(bet.placed_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {bet.potential_payout.toLocaleString()}¢ potential
                      </div>
                      {bet.outcome && (
                        <div className={`mt-1 font-semibold ${profit >= 0 ? 'text-gb-yes' : 'text-gb-no'}`}>
                          {profit >= 0 ? '+' : ''}{profit.toLocaleString()}¢ profit
                        </div>
                      )}
                      <div className="mt-1 text-sm text-muted-foreground">
                        Closes: {new Date(bet.market.ends_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
