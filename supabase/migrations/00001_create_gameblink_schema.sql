-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar TEXT,
  balance INTEGER NOT NULL DEFAULT 1000,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT NOT NULL,
  total_bets INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  pnl INTEGER NOT NULL DEFAULT 0,
  weekly_gain INTEGER NOT NULL DEFAULT 0,
  is_guest BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Markets table
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('kalshi', 'polymarket', 'custom', 'community')),
  source_url TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution_criteria TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Sports', 'Crypto', 'Politics', 'Entertainment', 'Business', 'Esports', 'Weather', 'Stocks', 'Forex', 'Community')),
  icon TEXT NOT NULL DEFAULT '📊',
  yes_price INTEGER NOT NULL DEFAULT 50,
  no_price INTEGER NOT NULL DEFAULT 50,
  volume INTEGER NOT NULL DEFAULT 0,
  bettors INTEGER NOT NULL DEFAULT 0,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'closed', 'resolved', 'disputed')),
  resolution TEXT CHECK (resolution IN ('yes', 'no')),
  history JSONB NOT NULL DEFAULT '[]',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'league')),
  league_id UUID,
  hot BOOLEAN NOT NULL DEFAULT false,
  trending BOOLEAN NOT NULL DEFAULT false,
  plugin_id TEXT,
  plugin_name TEXT,
  data_status TEXT NOT NULL DEFAULT 'mock' CHECK (data_status IN ('live', 'stale', 'failed', 'manual', 'mock')),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bets table
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  stake INTEGER NOT NULL,
  price_at_bet INTEGER NOT NULL,
  shares INTEGER NOT NULL,
  potential_payout INTEGER NOT NULL,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ,
  outcome TEXT CHECK (outcome IN ('win', 'loss', 'refund'))
);

-- Comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

-- Leagues table
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  invite_code TEXT UNIQUE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- League members table
CREATE TABLE league_members (
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- League invites table
CREATE TABLE league_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Friend requests table
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requestee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(requester_id, requestee_id)
);

-- Friends table (bidirectional)
CREATE TABLE friends (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, friend_id)
);

-- Daily streaks table
CREATE TABLE daily_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  streak INTEGER NOT NULL DEFAULT 0,
  last_claim_date DATE,
  total_earned INTEGER NOT NULL DEFAULT 0
);

-- Plugin status table
CREATE TABLE plugin_status (
  plugin_id TEXT PRIMARY KEY,
  plugin_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'syncing', 'failed', 'mock')),
  last_synced_at TIMESTAMPTZ,
  imported_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment upvotes table
CREATE TABLE comment_upvotes (
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (comment_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_ends_at ON markets(ends_at);
CREATE INDEX idx_markets_created_by ON markets(created_by);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_placed_at ON bets(placed_at);
CREATE INDEX idx_comments_market_id ON comments(market_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_friend_requests_requestee_id ON friend_requests(requestee_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_league_members_user_id ON league_members(user_id);

-- Enable Realtime for markets and bets
ALTER PUBLICATION supabase_realtime ADD TABLE markets;
ALTER PUBLICATION supabase_realtime ADD TABLE bets;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;