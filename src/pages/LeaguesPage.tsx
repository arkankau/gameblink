import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { League } from '@/types/types';
import { Plus, Lock, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LeaguesPage() {
  const { user } = useAuth();
  const [myLeagues, setMyLeagues] = useState<League[]>([]);
  const [publicLeagues, setPublicLeagues] = useState<League[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏆');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyLeagues();
    }
    fetchPublicLeagues();
  }, [user]);

  const fetchMyLeagues = async () => {
    if (!user) return;

    const { data: memberData } = await supabase
      .from('league_members')
      .select('league_id')
      .eq('user_id', user.id);

    if (memberData) {
      const leagueIds = memberData.map((m) => m.league_id);
      const { data: leagues } = await supabase
        .from('leagues')
        .select('*')
        .in('id', leagueIds);

      if (leagues) setMyLeagues(leagues);
    }
  };

  const fetchPublicLeagues = async () => {
    const { data } = await supabase
      .from('leagues')
      .select('*')
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setPublicLeagues(data);
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 10).toUpperCase() : null;

      const { data: league, error } = await supabase.rpc('create_league_with_creator', {
        p_name: name,
        p_icon: icon,
        p_description: description || null,
        p_is_private: isPrivate,
        p_invite_code: inviteCode,
      });

      if (error) throw error;

      toast.success('League created successfully!');
      setCreateModalOpen(false);
      setName('');
      setDescription('');
      setIcon('🏆');
      setIsPrivate(false);
      fetchMyLeagues();
      fetchPublicLeagues();
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeague = async (leagueId: string) => {
    if (!user) {
      toast.error('Please login to join leagues');
      return;
    }

    const { error } = await supabase.from('league_members').insert({
      league_id: leagueId,
      user_id: user.id,
    });

    if (error) {
      toast.error('Failed to join league');
    } else {
      toast.success('Joined league successfully!');
      fetchMyLeagues();
      fetchPublicLeagues();
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">LEAGUES</h1>
          <p className="mt-2 text-muted-foreground">Compete with friends and community</p>
        </div>

        {user && (
          <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create League
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display">CREATE LEAGUE</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateLeague} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">League Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Input
                    id="icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="px-3"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="private" className="cursor-pointer">
                    Private (invite only)
                  </Label>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Creating...' : 'Create League'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {user && myLeagues.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 font-display text-xl">My Leagues</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {myLeagues.map((league) => (
              <Link key={league.id} to={`/leagues/${league.id}`}>
                <Card className="h-full p-4 transition-all hover:border-primary">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-3xl">{league.icon}</span>
                    {league.is_private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <h3 className="mb-2 font-display text-lg">{league.name}</h3>
                  {league.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{league.description}</p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-4 font-display text-xl">Public Leagues</h2>
        {publicLeagues.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground">
            No public leagues yet. Create the first one!
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {publicLeagues.map((league) => {
              const isMember = myLeagues.some((ml) => ml.id === league.id);
              return (
                <Card key={league.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <span className="text-3xl">{league.icon}</span>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 font-display text-lg">{league.name}</h3>
                  {league.description && (
                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{league.description}</p>
                  )}
                  {isMember ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to={`/leagues/${league.id}`}>View League</Link>
                    </Button>
                  ) : (
                    <Button onClick={() => handleJoinLeague(league.id)} className="w-full">
                      Join League
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
