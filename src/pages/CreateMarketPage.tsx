import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MarketCategory } from '@/types/types';

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

export default function CreateMarketPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [resolutionCriteria, setResolutionCriteria] = useState('');
  const [category, setCategory] = useState<MarketCategory>('Community');
  const [endsAt, setEndsAt] = useState('');
  const [icon, setIcon] = useState('📊');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to create markets');
      navigate('/auth');
      return;
    }

    if (user.is_guest) {
      toast.error('Guests cannot create markets. Please create an account.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('markets')
        .insert({
          title,
          question,
          description,
          resolution_criteria: resolutionCriteria,
          category,
          icon,
          source: 'community',
          created_by: user.id,
          yes_price: 50,
          no_price: 50,
          ends_at: new Date(endsAt).toISOString(),
          history: [{ t: Date.now(), y: 50 }],
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Market created successfully!');
      navigate(`/market/${data.id}`);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to create market');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">CREATE MARKET</h1>
        <p className="mt-2 text-muted-foreground">
          Create your own prediction market for the community
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Market Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Will Bitcoin reach $100,000 by end of 2026?"
              required
              className="px-3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="question">Market Question *</Label>
            <Input
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will BTC close above $100,000 on Dec 31, 2026?"
              required
              className="px-3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide context and details about this market..."
              required
              className="min-h-24"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="criteria">Resolution Criteria *</Label>
            <Textarea
              id="criteria"
              value={resolutionCriteria}
              onChange={(e) => setResolutionCriteria(e.target.value)}
              placeholder="YES resolves if Bitcoin closes above $100,000 on CoinMarketCap at 11:59 PM UTC on December 31, 2026."
              required
              className="min-h-24"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as MarketCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon</Label>
              <Input
                id="icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="📊"
                className="px-3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endsAt">End Date *</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
              className="px-3"
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Creating...' : 'Create Market'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
