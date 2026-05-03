import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Lock, Globe, Users, TrendingUp, Share2, LogOut, Trophy, Medal, Award } from 'lucide-react';
import type { League, User } from '@/types/types';

interface LeagueMemberWithStats extends User {
  rank?: number;
}

export default function LeagueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMemberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchLeagueDetails();
    }
  }, [id, user]);

  const fetchLeagueDetails = async () => {
    if (!id) return;

    try {
      // Fetch league
      const { data: leagueData, error: leagueError } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (leagueError) throw leagueError;

      if (!leagueData) {
        toast.error('League not found or you do not have access');
        navigate('/leagues');
        return;
      }

      setLeague(leagueData);

      // Check if current user is a member
      if (user) {
        const { data: memberCheck } = await supabase
          .from('league_members')
          .select('user_id')
          .eq('league_id', id)
          .eq('user_id', user.id)
          .maybeSingle();

        setIsMember(!!memberCheck);
      }

      // Fetch members with stats
      const { data: memberData } = await supabase
        .from('league_members')
        .select('user_id')
        .eq('league_id', id);

      if (memberData && memberData.length > 0) {
        const userIds = memberData.map((m) => m.user_id);
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', userIds)
          .order('balance', { ascending: false });

        if (usersData) {
          const rankedMembers = usersData.map((u, index) => ({
            ...u,
            rank: index + 1,
          }));

          setMembers(rankedMembers);

          // Find current user's rank
          if (user) {
            const userRank = rankedMembers.find((m) => m.id === user.id)?.rank;
            setCurrentUserRank(userRank || null);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching league details:', err);
      toast.error('Failed to load league details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeague = async () => {
    if (!user || !id) return;

    try {
      const { error } = await supabase
        .from('league_members')
        .insert({
          league_id: id,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('Joined league successfully!');
      fetchLeagueDetails();
    } catch (err) {
      console.error('Error joining league:', err);
      toast.error('Failed to join league');
    }
  };

  const handleLeaveLeague = async () => {
    if (!user || !id) return;

    if (league?.created_by === user.id) {
      toast.error('League creators cannot leave their own league');
      return;
    }

    try {
      const { error } = await supabase
        .from('league_members')
        .delete()
        .eq('league_id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Left league successfully');
      navigate('/leagues');
    } catch (err) {
      console.error('Error leaving league:', err);
      toast.error('Failed to leave league');
    }
  };

  const handleInviteFriends = () => {
    if (league?.invite_code) {
      navigator.clipboard.writeText(league.invite_code);
      toast.success('Invite code copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading league...</p>
      </div>
    );
  }

  if (!league) {
    return null;
  }

  const totalPool = members.reduce((sum, m) => sum + m.balance, 0);

  return (
    <div className="min-h-screen w-full">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* League Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{league.icon}</div>
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h1 className="font-display text-3xl md:text-4xl">{league.name}</h1>
                  <Badge variant={league.is_private ? 'secondary' : 'default'}>
                    {league.is_private ? (
                      <>
                        <Lock className="mr-1 h-3 w-3" />
                        Private
                      </>
                    ) : (
                      <>
                        <Globe className="mr-1 h-3 w-3" />
                        Public
                      </>
                    )}
                  </Badge>
                </div>
                {league.description && (
                  <p className="text-muted-foreground">{league.description}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {!isMember && !league.is_private && user && (
                <Button onClick={handleJoinLeague}>
                  <Users className="mr-2 h-4 w-4" />
                  Join League
                </Button>
              )}
              {isMember && (
                <>
                  {league.is_private && (
                    <Button variant="outline" onClick={handleInviteFriends}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleLeaveLeague}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Leave
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Members</div>
              <div className="mt-1 text-2xl font-semibold">{members.length}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Total Pool</div>
              <div className="mt-1 text-2xl font-semibold">{totalPool.toLocaleString()}¢</div>
            </Card>
            {currentUserRank && (
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Your Rank</div>
                <div className="mt-1 text-2xl font-semibold">#{currentUserRank}</div>
              </Card>
            )}
            {league.invite_code && isMember && (
              <Card className="p-4">
                <div className="text-sm text-muted-foreground">Invite Code</div>
                <div className="mt-1 text-xl font-mono font-semibold">{league.invite_code}</div>
              </Card>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="mb-4 font-display text-2xl">League Leaderboard</h2>

          {/* Top 3 */}
          {members.length >= 3 && (
            <div className="mb-6 grid grid-cols-3 gap-4">
              {/* Rank 2 */}
              <Card className="p-4 text-center">
                <div className="mb-2 flex justify-center">
                  <Medal className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-muted-foreground">2</div>
                <div className="mt-2 text-xl">{members[1].avatar}</div>
                <div className="mt-1 font-semibold">{members[1].username}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {members[1].balance.toLocaleString()}¢
                </div>
              </Card>

              {/* Rank 1 */}
              <Card className="relative -mt-4 border-2 border-primary p-6 text-center">
                <div className="mb-2 flex justify-center">
                  <Trophy className="h-16 w-16 text-primary" />
                </div>
                <div className="text-4xl font-bold text-primary">1</div>
                <div className="mt-2 text-2xl">{members[0].avatar}</div>
                <div className="mt-1 text-lg font-bold">{members[0].username}</div>
                <div className="mt-1 text-primary">
                  {members[0].balance.toLocaleString()}¢
                </div>
              </Card>

              {/* Rank 3 */}
              <Card className="p-4 text-center">
                <div className="mb-2 flex justify-center">
                  <Award className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="text-3xl font-bold text-muted-foreground">3</div>
                <div className="mt-2 text-xl">{members[2].avatar}</div>
                <div className="mt-1 font-semibold">{members[2].username}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {members[2].balance.toLocaleString()}¢
                </div>
              </Card>
            </div>
          )}

          {/* Rest of members */}
          <div className="space-y-2">
            {members.slice(3).map((member) => (
              <Card key={member.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center font-semibold text-muted-foreground">
                      #{member.rank}
                    </div>
                    <div className="text-2xl">{member.avatar}</div>
                    <div>
                      <div className="font-semibold">{member.username}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.city}, {member.country}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{member.balance.toLocaleString()}¢</div>
                    <div className="text-sm text-muted-foreground">
                      {member.wins}W / {member.losses}L
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {members.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No members yet</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
