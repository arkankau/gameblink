import { useState, useEffect } from 'react';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { User, FriendRequestWithUser } from '@/types/types';
import { Search, UserPlus, Check, X } from 'lucide-react';

export default function FriendsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestWithUser[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestWithUser[]>([]);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id);

    if (data) {
      const friendIds = data.map((f) => f.friend_id);
      const { data: friendsData } = await supabase
        .from('users')
        .select('*')
        .in('id', friendIds);

      if (friendsData) setFriends(friendsData);
    }
  };

  const fetchRequests = async () => {
    if (!user) return;

    const { data: incoming } = await supabase
      .from('friend_requests')
      .select('*, requester:users!friend_requests_requester_id_fkey(*)')
      .eq('requestee_id', user.id)
      .eq('status', 'pending');

    const { data: outgoing } = await supabase
      .from('friend_requests')
      .select('*, requestee:users!friend_requests_requestee_id_fkey(*)')
      .eq('requester_id', user.id)
      .eq('status', 'pending');

    if (incoming) setIncomingRequests(incoming as unknown as FriendRequestWithUser[]);
    if (outgoing) setOutgoingRequests(outgoing as unknown as FriendRequestWithUser[]);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    const { data } = await supabase
      .from('users')
      .select('*')
      .or(`username.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`)
      .limit(10);

    if (data) setSearchResults(data);
  };

  const handleSendRequest = async (requesteeId: string) => {
    if (!user) return;

    const { error } = await supabase.from('friend_requests').insert({
      requester_id: user.id,
      requestee_id: requesteeId,
    });

    if (error) {
      toast.error('Failed to send friend request');
    } else {
      toast.success('Friend request sent');
      fetchRequests();
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const handleAcceptRequest = async (requestId: string, requesterId: string) => {
    if (!user) return;

    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: requesterId },
      { user_id: requesterId, friend_id: user.id },
    ]);

    toast.success('Friend request accepted');
    fetchFriends();
    fetchRequests();
  };

  const handleRejectRequest = async (requestId: string) => {
    await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    toast.success('Friend request rejected');
    fetchRequests();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl p-4 md:p-8">
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Please login to view friends</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">FRIENDS</h1>
        <p className="mt-2 text-muted-foreground">Connect with other players</p>
      </div>

      <div className="mb-6 space-y-4">
        <Card className="p-4">
          <h3 className="mb-3 font-display text-lg">Add Friend</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Search by username or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((result) => (
                <div key={result.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{result.avatar}</span>
                    <div>
                      <p className="font-medium">{result.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {result.city}, {result.country}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(result.id)}
                    disabled={result.id === user.id}
                  >
                    <UserPlus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {incomingRequests.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 font-display text-lg">Incoming Requests</h3>
            <div className="space-y-2">
              {incomingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{request.requester.avatar}</span>
                    <div>
                      <p className="font-medium">{request.requester.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.requester.city}, {request.requester.country}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.id, request.requester.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {outgoingRequests.length > 0 && (
          <Card className="p-4">
            <h3 className="mb-3 font-display text-lg">Pending Requests</h3>
            <div className="space-y-2">
              {outgoingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{request.requestee.avatar}</span>
                    <div>
                      <p className="font-medium">{request.requestee.username}</p>
                      <p className="text-xs text-muted-foreground">Pending...</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4">
        <h3 className="mb-3 font-display text-lg">My Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-center text-muted-foreground">No friends yet. Start adding!</p>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{friend.avatar}</span>
                  <div>
                    <p className="font-medium">{friend.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {friend.city}, {friend.country}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-gb-yes">+{friend.weekly_gain}</p>
                  <p className="text-xs text-muted-foreground">
                    {friend.wins}W / {friend.losses}L
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
