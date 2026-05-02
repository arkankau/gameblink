-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE plugin_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_upvotes ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is friend
CREATE OR REPLACE FUNCTION can_view_friend_content(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends
    WHERE (user_id = auth.uid() AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = auth.uid())
  );
$$;

-- Helper function: Check if user is league member
CREATE OR REPLACE FUNCTION can_view_league_content(target_league_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM league_members
    WHERE league_id = target_league_id AND user_id = auth.uid()
  );
$$;

-- Users policies
CREATE POLICY "Users are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Markets policies
CREATE POLICY "Public markets viewable by everyone" ON markets FOR SELECT USING (
  visibility = 'public' OR
  (visibility = 'friends' AND (created_by = auth.uid() OR can_view_friend_content(created_by))) OR
  (visibility = 'league' AND can_view_league_content(league_id))
);
CREATE POLICY "Authenticated users can create markets" ON markets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Market creators can update own markets" ON markets FOR UPDATE USING (created_by = auth.uid());

-- Bets policies
CREATE POLICY "Users can view own bets" ON bets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view bets on markets they can see" ON bets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM markets m
    WHERE m.id = market_id AND (
      m.visibility = 'public' OR
      (m.visibility = 'friends' AND (m.created_by = auth.uid() OR can_view_friend_content(m.created_by))) OR
      (m.visibility = 'league' AND can_view_league_content(m.league_id))
    )
  )
);
CREATE POLICY "Authenticated users can place bets" ON bets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments viewable on accessible markets" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM markets m
    WHERE m.id = market_id AND (
      m.visibility = 'public' OR
      (m.visibility = 'friends' AND (m.created_by = auth.uid() OR can_view_friend_content(m.created_by))) OR
      (m.visibility = 'league' AND can_view_league_content(m.league_id))
    )
  )
);
CREATE POLICY "Authenticated users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (user_id = auth.uid());

-- Leagues policies
CREATE POLICY "Public leagues viewable by everyone" ON leagues FOR SELECT USING (NOT is_private);
CREATE POLICY "Private leagues viewable by members" ON leagues FOR SELECT USING (
  is_private AND can_view_league_content(id)
);
CREATE POLICY "Authenticated users can create leagues" ON leagues FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "League creators can update leagues" ON leagues FOR UPDATE USING (created_by = auth.uid());

-- League members policies
CREATE POLICY "League members viewable by league members" ON league_members FOR SELECT USING (can_view_league_content(league_id));
CREATE POLICY "Users can join leagues" ON league_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave leagues" ON league_members FOR DELETE USING (auth.uid() = user_id);

-- League invites policies
CREATE POLICY "Users can view own invites" ON league_invites FOR SELECT USING (invitee_id = auth.uid() OR inviter_id = auth.uid());
CREATE POLICY "League members can invite" ON league_invites FOR INSERT WITH CHECK (
  auth.uid() = inviter_id AND can_view_league_content(league_id)
);
CREATE POLICY "Invitees can update invite status" ON league_invites FOR UPDATE USING (invitee_id = auth.uid());

-- Friend requests policies
CREATE POLICY "Users can view own friend requests" ON friend_requests FOR SELECT USING (
  requester_id = auth.uid() OR requestee_id = auth.uid()
);
CREATE POLICY "Authenticated users can send friend requests" ON friend_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Requestees can update friend requests" ON friend_requests FOR UPDATE USING (requestee_id = auth.uid());
CREATE POLICY "Requesters can delete own requests" ON friend_requests FOR DELETE USING (requester_id = auth.uid());

-- Friends policies
CREATE POLICY "Users can view own friends" ON friends FOR SELECT USING (user_id = auth.uid() OR friend_id = auth.uid());
CREATE POLICY "Users can add friends" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove friends" ON friends FOR DELETE USING (auth.uid() = user_id);

-- Daily streaks policies
CREATE POLICY "Users can view own streak" ON daily_streaks FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own streak" ON daily_streaks FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own streak" ON daily_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Plugin status policies (public read)
CREATE POLICY "Plugin status viewable by everyone" ON plugin_status FOR SELECT USING (true);

-- Comment upvotes policies
CREATE POLICY "Upvotes viewable by everyone" ON comment_upvotes FOR SELECT USING (true);
CREATE POLICY "Users can upvote comments" ON comment_upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own upvotes" ON comment_upvotes FOR DELETE USING (auth.uid() = user_id);