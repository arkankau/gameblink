import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Market, Bet, BetWithUser, Comment, CommentWithUser } from '@/types/types';
import { TrendingUp, Users, Clock, MessageSquare } from 'lucide-react';
import { Countdown, formatCloseDateTime } from '@/components/ui/countdown';
import { MarketChart } from '@/components/ui/market-chart';

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [market, setMarket] = useState<Market | null>(null);
  const [bets, setBets] = useState<BetWithUser[]>([]);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [side, setSide] = useState<'yes' | 'no'>(searchParams.get('side') === 'no' ? 'no' : 'yes');
  const [stake, setStake] = useState<number>(100);
  const [commentBody, setCommentBody] = useState('');
  const [commentSort, setCommentSort] = useState<'new' | 'top' | 'hot'>('new');
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchMarket();
      fetchBets();
      fetchComments();
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchComments();
    }
  }, [commentSort]);

  const fetchMarket = async () => {
    try {
      const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching market:', error);
        toast.error('Market not found');
        navigate('/');
      } else {
        setMarket(data);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Market fetch aborted safely');
      } else {
        console.error('Unexpected error fetching market:', err);
        toast.error('Failed to load market');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBets = async () => {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*, user:users!bets_user_id_fkey(*)')
        .eq('market_id', id)
        .order('placed_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setBets(data as unknown as BetWithUser[]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Bets fetch aborted safely');
      } else {
        console.error('Unexpected error fetching bets:', err);
      }
    }
  };

  const fetchComments = async () => {
    try {
      let query = supabase
        .from('comments')
        .select('*, user:users!comments_user_id_fkey(*)')
        .eq('market_id', id)
        .is('parent_id', null);

      // Apply sorting based on commentSort state
      if (commentSort === 'new') {
        query = query.order('created_at', { ascending: false });
      } else if (commentSort === 'top') {
        query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false });
      } else if (commentSort === 'hot') {
        // Hot: combination of upvotes and recency
        query = query.order('upvotes', { ascending: false }).order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Comment fetch error:', error);
        return;
      }

      if (data) {
        setComments(data as unknown as CommentWithUser[]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Comments fetch aborted safely');
      } else {
        console.error('Unexpected error fetching comments:', err);
      }
    }
  };

  const handlePlaceBet = async () => {
    if (!user) {
      toast.error('Please login to place bets');
      navigate('/auth');
      return;
    }

    if (!market) return;

    // Validate market status
    if (market.status !== 'live') {
      toast.error('This market is closed');
      return;
    }

    // Validate market not expired
    if (new Date(market.ends_at) <= new Date()) {
      toast.error('This market has closed');
      return;
    }

    if (stake > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (stake < 10) {
      toast.error('Minimum stake is 10 coins');
      return;
    }

    const priceAtBet = side === 'yes' ? market.yes_price : market.no_price;
    const shares = Math.floor((stake / priceAtBet) * 100);
    const potentialPayout = shares;

    try {
      const { data, error } = await supabase.rpc('place_bet', {
        p_market_id: market.id,
        p_side: side,
        p_stake: stake,
        p_price_at_bet: priceAtBet,
        p_shares: shares,
        p_potential_payout: potentialPayout,
      });

      if (error) {
        console.error('Bet placement error:', error);
        toast.error(error.message || 'Failed to place bet');
        return;
      }

      toast.success('Bet placed successfully! 🎉');
      await refreshUser();
      fetchMarket();
      fetchBets();
    } catch (err) {
      console.error('Unexpected error placing bet:', err);
      toast.error('Failed to place bet');
    }
  };

  const handlePostComment = async () => {
    if (!user) {
      toast.error('Please login to comment');
      return;
    }

    if (!commentBody.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          market_id: id,
          user_id: user.id,
          body: commentBody,
        })
        .select('*, user:users!comments_user_id_fkey(*)')
        .single();

      if (error) {
        console.error('Comment insert error:', error);
        toast.error(error.message || 'Failed to post comment');
        return;
      }

      if (data) {
        // Add the new comment to the top of the list
        setComments([data as unknown as CommentWithUser, ...comments]);
        setCommentBody('');
        toast.success('Comment posted');
      }
    } catch (err) {
      console.error('Unexpected error posting comment:', err);
      toast.error('Failed to post comment');
    }
  };

  const handleUpvote = async (commentId: string) => {
    if (!user) {
      toast.error('Please login to upvote');
      navigate('/auth');
      return;
    }

    setUpvotingId(commentId);

    try {
      const { error } = await supabase.rpc('increment_comment_upvote', {
        p_comment_id: commentId,
      });

      if (error) {
        console.error('Upvote error:', error);
        toast.error('Failed to upvote');
        return;
      }

      // Update local state optimistically
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, upvotes: (comment.upvotes ?? 0) + 1 }
            : comment
        )
      );
    } catch (err) {
      console.error('Unexpected upvote error:', err);
      toast.error('Failed to upvote');
    } finally {
      setUpvotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <Card className="h-96 animate-pulse bg-muted" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <Card className="p-12 text-center">
          <p>Market not found</p>
        </Card>
      </div>
    );
  }

  const potentialPayout = Math.floor((stake / (side === 'yes' ? market.yes_price : market.no_price)) * 100);
  const potentialProfit = potentialPayout - stake;

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-3xl">{market.icon}</span>
              <Badge variant="outline">{market.category}</Badge>
              <Badge variant="outline">{market.source}</Badge>
              {market.hot && <Badge className="bg-gb-hot">HOT</Badge>}
              {market.data_status === 'live' && <Badge className="bg-primary">LIVE</Badge>}
            </div>
            <h1 className="font-display text-3xl md:text-4xl">{market.title}</h1>
            <p className="mt-2 text-lg text-muted-foreground">{market.question}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Volume
            </div>
            <p className="font-mono text-xl">{market.volume.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Bettors
            </div>
            <p className="font-mono text-xl">{market.bettors}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Closes
            </div>
            <p className="mt-1 text-sm font-medium">{formatCloseDateTime(market.ends_at)}</p>
            <div className="mt-2">
              <Countdown endsAt={market.ends_at} />
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Status</div>
            <p className="text-sm capitalize">{market.status}</p>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="discussion">Discussion</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="p-6">
                <h3 className="mb-4 font-display text-xl">Market Price History</h3>
                <MarketChart 
                  history={market.history} 
                  currentYesPrice={market.yes_price}
                  variant="detail"
                />
              </Card>

              <Card className="p-6">
                <h3 className="mb-2 font-display text-xl">Description</h3>
                <p className="text-muted-foreground">{market.description}</p>
              </Card>

              <Card className="p-6">
                <h3 className="mb-2 font-display text-xl">Resolution Criteria</h3>
                <p className="text-muted-foreground">{market.resolution_criteria}</p>
              </Card>

              {market.source_url && (
                <Card className="p-6">
                  <h3 className="mb-2 font-display text-xl">Source</h3>
                  <a
                    href={market.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {market.source_url}
                  </a>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity" className="space-y-3">
              {bets.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No bets yet. Be the first!
                </Card>
              ) : (
                bets.map((bet) => (
                  <Card key={bet.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{bet.user.avatar}</span>
                        <div>
                          <p className="font-medium">{bet.user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bet.placed_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={bet.side === 'yes' ? 'bg-gb-yes' : 'bg-gb-no'}>
                          {bet.side.toUpperCase()}
                        </Badge>
                        <p className="mt-1 font-mono text-sm">{bet.stake} coins</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="discussion" className="space-y-4">
              {user ? (
                <Card className="p-4">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="mb-3 min-h-24"
                  />
                  <Button onClick={handlePostComment}>Post Comment</Button>
                </Card>
              ) : (
                <Card className="p-6 text-center text-muted-foreground">
                  You must login to comment
                </Card>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort by:</span>
                <Button
                  variant={commentSort === 'new' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCommentSort('new')}
                >
                  New
                </Button>
                <Button
                  variant={commentSort === 'top' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCommentSort('top')}
                >
                  Top
                </Button>
                <Button
                  variant={commentSort === 'hot' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setCommentSort('hot')}
                >
                  Hot
                </Button>
              </div>

              {comments.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  No comments yet. Start the discussion!
                </Card>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{comment.user.avatar}</span>
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="font-medium">{comment.user.username}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm">{comment.body}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpvote(comment.id)}
                            disabled={upvotingId === comment.id}
                          >
                            👍 {comment.upvotes ?? 0}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="sticky top-20 p-6">
            <h3 className="mb-4 font-display text-xl">Place Bet</h3>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <Button
                variant={side === 'yes' ? 'default' : 'outline'}
                onClick={() => setSide('yes')}
                className={side === 'yes' ? 'bg-gb-yes text-background' : ''}
              >
                <span className="font-mono">YES {market.yes_price}¢</span>
              </Button>
              <Button
                variant={side === 'no' ? 'default' : 'outline'}
                onClick={() => setSide('no')}
                className={side === 'no' ? 'bg-gb-no text-background' : ''}
              >
                <span className="font-mono">NO {market.no_price}¢</span>
              </Button>
            </div>

            <div className="mb-4 space-y-2">
              <label className="text-sm font-medium">Stake</label>
              <Input
                type="number"
                value={stake}
                onChange={(e) => setStake(Number(e.target.value))}
                min={10}
                max={user?.balance || 0}
                className="px-3"
              />
              <div className="flex gap-2">
                {[50, 100, 250, 500, 1000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setStake(amount)}
                    className="flex-1"
                  >
                    {amount}
                  </Button>
                ))}
              </div>
              {user && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStake(user.balance)}
                  className="w-full"
                >
                  Max
                </Button>
              )}
            </div>

            <div className="mb-4 space-y-2 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Payout</span>
                <span className="font-mono font-semibold">{potentialPayout} coins</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Potential Profit</span>
                <span className={`font-mono font-semibold ${potentialProfit > 0 ? 'text-gb-yes' : ''}`}>
                  +{potentialProfit} coins
                </span>
              </div>
            </div>

            <Button 
              onClick={handlePlaceBet} 
              className="w-full" 
              disabled={!user || market.status !== 'live' || new Date(market.ends_at) <= new Date()}
            >
              {!user 
                ? 'Login to Bet' 
                : market.status !== 'live' || new Date(market.ends_at) <= new Date()
                ? 'Market Closed' 
                : 'Place Bet'}
            </Button>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              Virtual coins only · No real money
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
