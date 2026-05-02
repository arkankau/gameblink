import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Market, MarketCategory, MarketStats } from '@/types/types';
import { useAuth } from '@/contexts/AuthContext';

const categories: MarketCategory[] = [
  'Sports',
  'Crypto',
  'Politics',
  'Entertainment',
  'Business',
  'Esports',
  'Weather',
  'Stocks',
  'Forex',
  'Community',
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [stats, setStats] = useState<MarketStats>({
    live_markets: 0,
    total_volume: 0,
    hot_markets: 0,
    online_users: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMarkets();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredMarkets(markets);
    } else {
      setFilteredMarkets(markets.filter((m) => m.category === selectedCategory));
    }
  }, [selectedCategory, markets]);

  const fetchMarkets = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('status', 'live')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching markets:', error);
      } else {
        setMarkets(data || []);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Market fetch aborted safely');
      } else {
        console.error('Unexpected error fetching markets:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: liveCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live');

      const { data: volumeData } = await supabase
        .from('markets')
        .select('volume');

      const totalVolume = volumeData?.reduce((sum, m) => sum + m.volume, 0) || 0;

      const { count: hotCount } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('hot', true);

      setStats({
        live_markets: liveCount || 0,
        total_volume: totalVolume,
        hot_markets: hotCount || 0,
        online_users: Math.floor(Math.random() * 500) + 100,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Stats fetch aborted safely');
      } else {
        console.error('Unexpected error fetching stats:', err);
      }
    }
  };

  const handleCreateMarket = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (user.is_guest) {
      alert('Please create an account to create markets');
      navigate('/auth');
      return;
    }
    navigate('/create-market');
  };

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="gb-section-marker mb-2">§01 MARKETS</p>
              <h1 className="font-display text-3xl md:text-5xl">
                Today the market is wide open.
              </h1>
            </div>
            <Button
              onClick={handleCreateMarket}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Market
            </Button>
          </div>

          <div className="gb-editorial border-y border-border py-2">
            Vol. 04 · Issue 01 · May 02, 2026
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <p className="font-mono text-sm text-muted-foreground">Live Markets</p>
              <p className="font-display text-2xl">{stats.live_markets}</p>
            </Card>
            <Card className="p-4">
              <p className="font-mono text-sm text-muted-foreground">Total Volume</p>
              <p className="font-display text-2xl">{stats.total_volume.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <p className="font-mono text-sm text-muted-foreground">Hot Markets</p>
              <p className="font-display text-2xl">{stats.hot_markets}</p>
            </Card>
            <Card className="p-4">
              <p className="font-mono text-sm text-muted-foreground">Online Users</p>
              <p className="font-display text-2xl">{stats.online_users}</p>
            </Card>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'All' ? 'default' : 'outline'}
            onClick={() => setSelectedCategory('All')}
            size="sm"
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              size="sm"
            >
              {cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-64 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filteredMarkets.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No markets found in this category.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMarkets.map((market) => (
              <Link key={market.id} to={`/market/${market.id}`}>
                <Card className="h-full p-4 transition-all hover:border-primary">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-2xl">{market.icon}</span>
                    <div className="flex gap-1">
                      {market.hot && (
                        <Badge className="bg-gb-hot text-xs">HOT</Badge>
                      )}
                      {market.data_status === 'live' && (
                        <Badge className="bg-primary text-xs">LIVE</Badge>
                      )}
                    </div>
                  </div>

                  <h3 className="mb-2 font-display text-lg line-clamp-2">
                    {market.title}
                  </h3>

                  <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                    {market.question}
                  </p>

                  <div className="mb-3 flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {market.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {market.source}
                    </Badge>
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="bg-gb-yes text-background hover:bg-gb-yes/90"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/market/${market.id}?side=yes`);
                      }}
                    >
                      <span className="font-mono">YES {market.yes_price}¢</span>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gb-no text-background hover:bg-gb-no/90"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/market/${market.id}?side=no`);
                      }}
                    >
                      <span className="font-mono">NO {market.no_price}¢</span>
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono">Vol: {market.volume.toLocaleString()}</span>
                    <span className="font-mono">{market.bettors} bettors</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    Closes: {new Date(market.ends_at).toLocaleDateString()}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 overflow-hidden border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="gb-ticker flex gap-8 py-2 font-mono text-xs text-muted-foreground">
          {markets.slice(0, 10).map((m) => (
            <span key={m.id} className="whitespace-nowrap">
              {m.title} · YES {m.yes_price}¢ · NO {m.no_price}¢
            </span>
          ))}
          {markets.slice(0, 10).map((m) => (
            <span key={`${m.id}-dup`} className="whitespace-nowrap">
              {m.title} · YES {m.yes_price}¢ · NO {m.no_price}¢
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
