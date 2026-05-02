export type MarketSource = 'kalshi' | 'polymarket' | 'custom' | 'community';
export type MarketStatus = 'live' | 'closed' | 'resolved' | 'disputed';
export type MarketCategory =
  | 'Sports'
  | 'Crypto'
  | 'Politics'
  | 'Entertainment'
  | 'Business'
  | 'Esports'
  | 'Weather'
  | 'Stocks'
  | 'Forex'
  | 'Community';
export type BetSide = 'yes' | 'no';
export type BetOutcome = 'win' | 'loss' | 'refund';
export type DataStatus = 'live' | 'stale' | 'failed' | 'manual' | 'mock';
export type PluginStatusType = 'connected' | 'syncing' | 'failed' | 'mock';
export type MarketVisibility = 'public' | 'friends' | 'league';
export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';
export type LeagueInviteStatus = 'pending' | 'accepted' | 'rejected';

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  balance: number;
  city: string;
  country: string;
  country_code: string;
  total_bets: number;
  wins: number;
  losses: number;
  pnl: number;
  weekly_gain: number;
  is_guest: boolean;
  created_at: string;
  last_active_at: string;
}

export interface Market {
  id: string;
  source: MarketSource;
  source_url?: string;
  created_by?: string;
  title: string;
  question: string;
  description: string;
  resolution_criteria: string;
  category: MarketCategory;
  icon: string;
  yes_price: number;
  no_price: number;
  volume: number;
  bettors: number;
  ends_at: string;
  status: MarketStatus;
  resolution?: 'yes' | 'no';
  history: Array<{ t: number; y: number }>;
  visibility: MarketVisibility;
  league_id?: string;
  hot: boolean;
  trending: boolean;
  plugin_id?: string;
  plugin_name?: string;
  data_status: DataStatus;
  last_synced_at?: string;
  created_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  side: BetSide;
  stake: number;
  price_at_bet: number;
  shares: number;
  potential_payout: number;
  placed_at: string;
  settled_at?: string;
  outcome?: BetOutcome;
}

export interface BetWithUser extends Bet {
  user: User;
}

export interface Comment {
  id: string;
  market_id: string;
  user_id: string;
  parent_id?: string;
  body: string;
  upvotes: number;
  created_at: string;
  edited_at?: string;
}

export interface CommentWithUser extends Comment {
  user: User;
  user_bet_side?: BetSide;
}

export interface League {
  id: string;
  name: string;
  icon: string;
  description?: string;
  is_private: boolean;
  invite_code?: string;
  created_by: string;
  total_pool: number;
  created_at: string;
}

export interface LeagueWithMembers extends League {
  member_count: number;
  user_rank?: number;
}

export interface LeagueMember {
  league_id: string;
  user_id: string;
  joined_at: string;
}

export interface LeagueInvite {
  id: string;
  league_id: string;
  inviter_id: string;
  invitee_id: string;
  status: LeagueInviteStatus;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  requestee_id: string;
  status: FriendRequestStatus;
  created_at: string;
}

export interface FriendRequestWithUser extends FriendRequest {
  requester: User;
  requestee: User;
}

export interface Friend {
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface DailyStreak {
  user_id: string;
  streak: number;
  last_claim_date?: string;
  total_earned: number;
}

export interface PluginStatus {
  plugin_id: string;
  plugin_name: string;
  status: PluginStatusType;
  last_synced_at?: string;
  imported_count: number;
  last_error?: string;
  updated_at: string;
}

export interface LeaderboardEntry {
  user: User;
  rank: number;
  gain: number;
  rank_change?: number;
}

export interface NetworkStats {
  friends_count: number;
  online_friends_count: number;
  leagues_count: number;
}

export interface MarketStats {
  live_markets: number;
  total_volume: number;
  hot_markets: number;
  online_users: number;
}
