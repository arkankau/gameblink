# Requirements Document

## 1. Application Overview

### 1.1 Application Name

GameBlink

### 1.2 Application Description

GameBlink is a Kalshi-style virtual prediction market platform where users bet with virtual coins only. The platform combines the energy of a live trading floor with a game show atmosphere, offering fast, competitive, and social prediction experiences. Users predict real-world outcomes using virtual currency earned through winning bets, daily login rewards, or admin-seeded balances for testing. The platform explicitly prohibits real-money deposits, withdrawals, crypto payments, or real financial betting.

Tagline: No money · all skill.

### 1.3 Target Users

- Primary: Users in Indonesia (Tangerang, Jakarta, Bandung, Surabaya, Bali)
- Secondary: Global users

### 1.4 Design Constraints

- Preserve existing GameBlink visual design, layout, color palette, typography, and trading floor/gameshow aesthetic
- Background: Warm near-black #0B0B0E with 22px dot grid pattern
- Accent colors: Acid lime #C7FF3D (YES/wins/profits), Coral red #FF4D5E (NO/losses), Amber gold #FFB627 (coins), Orange #FF7A2E (hot markets/streaks)
- Typography: Anton (display), JetBrains Mono (data/prices), Manrope (body)
- Design elements: Section markers (§01, §02, §03), editorial strips, live horizontal ticker, sparkline charts, animated price ticks, confetti animations, flame animations
- Only improve missing functionality, flows, data integration, navigation clarity, and backend logic

## 2. User and Usage Scenarios

### 2.1 Target Users

- Prediction market enthusiasts seeking risk-free betting experiences
- Social gamers interested in competitive leaderboards and leagues
- Users wanting to test prediction skills without financial risk
- Community members creating and participating in custom prediction markets

### 2.2 Core Usage Scenarios

- Placing virtual coin bets on real-world outcome predictions
- Creating custom community prediction markets
- Competing with friends and league members on leaderboards
- Discussing market movements and outcomes in forums
- Earning virtual coins through successful predictions and daily login streaks
- Building social networks through friend connections and league participation

## 3. Page Structure and Functionality

### 3.1 Page Structure Overview

```
GameBlink Application
├── Authentication
│   ├── Login Modal/Page
│   └── Sign Up Modal/Page
├── Home / Markets
├── Bet Details
├── Create Market
├── Market Discussion / Forum
├── Friends
├── Leagues
│   ├── My Leagues
│   ├── Create League
│   ├── League Detail
│   └── Public Leagues
├── Leaderboard
├── Daily Login
├── User Profile
└── Plugin & Data Status Panel
```

### 3.2 Authentication

#### 3.2.1 Header Authentication Controls

- When logged out: Display Login and Sign Up buttons
- When logged in: Display user avatar, username, coin balance, and dropdown menu with Profile, My Bets, Friends, Leagues, Logout options

#### 3.2.2 Login / Sign Up UI

- Implement as modal or dedicated page maintaining GameBlink visual consistency
- Login fields: Username/Email, Password
- Sign Up fields: Username, Email, Password, City selection, Country selection, Optional avatar emoji
- Support Continue as Guest option

#### 3.2.3 Guest Mode

- Allow browsing and demo betting with 500 starter virtual coins
- Prompt account creation when attempting to add friends, create leagues, or create markets

#### 3.2.4 Starter Balance

- New registered users: 1,000 virtual coins
- Guest users: 500 virtual coins
- Clearly label balance as virtual coins throughout UI

### 3.3 Home / Markets Page

#### 3.3.1 Page Header

- Editorial headline: Today the market is wide open.
- Stats strip displaying: Live markets count, Total virtual coin volume, Hot markets count, Online users

#### 3.3.2 Category Filters

- All, Sports, Crypto, Politics, Entertainment, Business, Esports, Weather, Stocks, Forex, Community

#### 3.3.3 Market Cards Display

- Icon or source image
- Market title and question
- Category badge
- Source badge: Kalshi, Polymarket, Weather, Stock, Forex, Community
- YES price button and NO price button
- Sparkline price chart
- Volume and bettors count
- Closing date
- HOT badge if trending
- LIVE badge if real-time sync active

#### 3.3.4 Create Market Button

- Visible on Home page
- Opens Create Market page/modal
- Restricted to logged-in users (guests prompted to sign up)

#### 3.3.5 Market Card Interactions

- Click card: Opens Bet Details page
- Click YES/NO: Opens Bet Details with preselected side
- Price updates animate with gb-tick class
- Header ticker continuously scrolls live price movements

### 3.4 Bet Details Page

#### 3.4.1 Market Information Display

- Full market title and question
- Description and resolution criteria
- Source badge and source URL (if available)
- Large price chart with 50¢ guideline
- YES/NO price display
- Volume, bettors count, closing time
- Data status: Live from Plugin 757, Scraped by Plugin 859, Community market, or Fallback mock data

#### 3.4.2 Betting Ticket

- YES/NO toggle
- Stake input field with Max button
- Quick chip buttons: 50, 100, 250, 500, 1000
- Potential payout preview
- Potential profit preview
- Place Bet button

#### 3.4.3 Bet Calculation Logic

- Shares = floor((stake / priceAtBet) * 100)
- Payout = shares
- Profit = payout - stake
- Loss = stake
- Price impact = min((stake / 1000) * 1.5, 4)

#### 3.4.4 Bet Validation

- Prevent betting with insufficient balance
- Prevent betting after market closes
- Enforce minimum stake requirement
- Display clear error states
- Update balance immediately after successful bet
- Trigger confetti animation on successful bet
- Update activity feed instantly

#### 3.4.5 Activity Feed

- Display latest 20 bets
- Show: avatar, username, YES/NO side, stake amount, time ago
- Update via WebSocket for real-time new bets

### 3.5 Create Market Page

#### 3.5.1 Access Control

- Restricted to logged-in users
- Accessible via Home page button, header/nav, or empty category states

#### 3.5.2 Create Market Form Fields

- Market question (required)
- Short title (required)
- Description (required)
- Category selection: Sports, Crypto, Politics, Entertainment, Business, Esports, Weather, Stocks, Forex, Community
- End date/time (required)
- Initial YES price (default 50¢)
- Resolution source: Manual community resolution, Weather plugin, Stock plugin, Forex plugin, News/source URL
- Optional source URL
- Resolution criteria (required): Clear definition of outcome determination
- Visibility: Public, Friends only, League only

#### 3.5.3 Community Market Rules

- Creator shown on market page
- Market source labeled as community
- Appears in Community category
- Supports virtual coin betting
- Includes forum discussion capability
- Requires clear resolution criteria

### 3.6 Market Discussion / Forum

#### 3.6.1 Forum Placement

- Located on Bet Details page below activity feed or in tabbed interface: Overview, Activity, Discussion, Sources

#### 3.6.2 Discussion Features

- Post comments
- Reply to comments
- Upvote comments
- Sort options: Top, New, Hot
- Comment display: avatar, username, time ago, user city/country, optional YES/NO position badge if user has bet
- Guest restriction: Display You must login to comment for non-authenticated users

#### 3.6.3 News Context Integration

- Use Plugin 775 News to fetch and display 3-5 relevant news/context cards per market
- Show source name and timestamp
- Enable discussion on news items

#### 3.6.4 AI Search Integration

- Display AI-generated summaries:
  - Why this market is moving
  - Bull case
  - Bear case
  - Key uncertainty

### 3.7 Friends Page

#### 3.7.1 Network Stats Section

- Friends count
- Online friends count
- Leagues count

#### 3.7.2 Add Friend Section

- Search input supporting: username, user ID, city
- Search results display: avatar, username, city/country, win rate, weekly gain
- Action buttons: Add Friend, Pending (if requested), Friends (if already connected)

#### 3.7.3 Friend Request Flow

- User A searches and sends request to User B
- User B receives incoming request with Accept/Reject options
- Upon acceptance: mutual friend connection established
- Upon rejection: request removed
- Pending state visible for outgoing requests

#### 3.7.4 Pending Requests Management

- Incoming requests: Accept and Reject buttons
- Outgoing requests: Cancel Request button

#### 3.7.5 Friends Roster

- Default sort: weekly gain
- Display: avatar, username, online status (active within 15 minutes), city/country, win rate, weekly profit/loss
- Actions: view profile, invite to league, remove friend

#### 3.7.6 Suggested Users

- Priority order: Same city, Same country, Worldwide
- Reason badges: Same city, Indonesia, Trending player

### 3.8 Leagues Page

#### 3.8.1 My Leagues Section

- League card display: icon, name, public/private badge, member count, total pool, user rank, top 3 mini leaderboard
- Open button for league detail access

#### 3.8.2 Create League

- Visible Create League button above My Leagues
- Modal fields:
  - League name (required)
  - Emoji icon picker
  - Description (optional)
  - Privacy: Public or Private invite-only
  - Optional starting rules: Default market visibility, Members only discussion
- Creator automatically joins as first member
- Generates invite code for private leagues

#### 3.8.3 League Detail Page

- Header: name, icon, member count, total pool
- Leaderboard
- Members list
- Invite friends button
- League markets tab
- League discussion tab
- Leave league button
- Creator controls: remove members

#### 3.8.4 Joining Leagues

- Public leagues: Direct join via Join button
- Private leagues: Require invite code or friend invite

#### 3.8.5 League Invitations

- Select friends from friends list
- Send invites
- Recipients see invites in Leagues page Invites section

### 3.9 Leaderboard Page

#### 3.9.1 Leaderboard Scopes

- City: Filters by same city users
- Country: Filters by same country users
- Worldwide: Includes all users
- Friends: Only includes friend connections
- League: Only includes league members

#### 3.9.2 Timeframes

- Week
- Month
- All time

#### 3.9.3 Ranking Display

- Sort by profit/loss for selected timeframe
- Top 3 podium display
- Full ranking list
- User pinned position if below top 50
- Display: avatar, username, city/country, timeframe gain, win rate, rank movement indicator

### 3.10 Daily Login Page

#### 3.10.1 Daily Streak System

- 7-day rolling streak
- Reward structure:
  - Day 1: 100 coins
  - Day 2: 150 coins
  - Day 3: 200 coins
  - Day 4: 250 coins
  - Day 5: 300 coins
  - Day 6: 350 coins
  - Day 7: 1000 coins
- Claim button active only if claimable today
- Flame animation after successful claim
- Streak resets if user skips a day
- After Day 7, loops back to Day 1

### 3.11 Plugin & Data Status Panel

#### 3.11.1 Panel Access

- Accessible as dev/status page, collapsible footer/header panel, or admin-style page

#### 3.11.2 Plugin Status Display

- Per plugin information:
  - Plugin name and ID
  - Status: Connected, Syncing, Failed, Mock fallback
  - Last synced timestamp
  - Last response summary
  - Number of markets/data points imported
  - Error message if failed

#### 3.11.3 Per-Market Data Source Display

- Source badge
- Plugin used
- Last synced timestamp
- Real-time status: Live, Stale, Failed, Mock
- Clear Mock fallback labeling when plugin unavailable

## 4. Business Rules and Logic

### 4.1 Virtual Currency System

- All transactions use virtual coins only
- No real-money deposits, withdrawals, crypto payments, or financial betting
- Virtual coins earned through: winning bets, daily login rewards, admin-seeded testing balances
- Balance updates immediately after bet placement and resolution

### 4.2 Betting Mechanics

- Bet calculation: shares = floor((stake / priceAtBet) * 100)
- Win payout: shares amount
- Profit calculation: payout - stake
- Loss: full stake amount
- Price impact: min((stake / 1000) * 1.5, 4)
- Minimum stake enforcement
- Insufficient balance prevention
- Post-close betting prevention

### 4.3 Market Resolution

- Community markets: Manual resolution by creator or community vote
- Plugin-based markets: Auto-resolution via Weather, Stock, Forex plugins when available
- Resolution criteria must be clearly defined at market creation
- Resolved markets distribute payouts to winning bets

### 4.4 Friend System

- Bidirectional friend requests
- Pending state visibility for both incoming and outgoing requests
- Accept/reject/cancel actions
- Mutual connection establishment upon acceptance
- Friend removal capability

### 4.5 League System

- Public leagues: Open join
- Private leagues: Invite-only via code or friend invitation
- Creator privileges: member removal
- Automatic creator membership upon league creation
- League leaderboard based on member balances and performance

### 4.6 Daily Streak System

- One claim per day
- Consecutive day requirement for streak maintenance
- Streak reset upon missed day
- 7-day cycle with loop back to Day 1

### 4.7 Real-Time Data Sync

- Plugin 757: Live YES/NO market prices from Kalshi/Polymarket, 6-second update interval
- Plugin 859: Market listings and details scraping from Kalshi and Polymarket
- Plugin 738: Stock price data for stock-based markets
- Plugin 610: Indonesian weather data for weather markets (Jakarta, Tangerang, Bandung, Surabaya, Bali)
- Plugin 754: Forex rates for forex prediction markets
- Plugin 775: News context for market discussions
- AI Search: Trending topics discovery and market context summarization
- Fallback to mock data with clear labeling when plugins fail

### 4.8 WebSocket Real-Time Events

- Server to client: price_update, new_bet, market_resolved, leaderboard_update, friend_request, league_invite, comment_created
- Client to server: subscribe_market, unsubscribe_market, subscribe_league, unsubscribe_league
- Price sync every 6 seconds for live markets
- Activity feed instant updates
- Leaderboard updates after bets/resolutions
- Online status updates every 60 seconds
- Friend online indicator for activity within last 15 minutes

## 5. Exception and Boundary Conditions

| Scenario                          | Handling                                                            |
| --------------------------------- | ------------------------------------------------------------------- |
| Insufficient balance for bet      | Display error message, disable Place Bet button                     |
| Betting after market closes       | Prevent bet placement, show market closed status                    |
| Below minimum stake               | Display error message, enforce minimum                              |
| Plugin connection failure         | Display Mock fallback label, use seeded mock data                   |
| WebSocket disconnection           | Automatic reconnection attempt                                      |
| Guest attempting protected action | Prompt to create account (add friend, create league, create market) |
| Duplicate friend request          | Show Pending button state                                           |
| Already friends                   | Show Friends badge                                                  |
| Private league without invite     | Require invite code or friend invitation                            |
| Missed daily login day            | Reset streak to Day 1                                               |
| Market resolution dispute         | Mark market as disputed status                                      |
| Invalid market creation data      | Display validation errors, prevent submission                       |
| Comment posting while logged out  | Display You must login to comment message                           |
| Real-money related requests       | Explicitly prohibited, no payment/crypto/withdrawal features        |

## 6. Required Backend Structure

### Core Data Entities

Persist these entities:

- User
- Market
- Bet
- Comment
- FriendRequest
- League
- LeagueInvite
- DailyStreak
- PluginStatus

Each Market must store:

- source, sourceUrl, createdBy
- question, description, resolutionCriteria
- yesPrice, noPrice, history
- visibility, leagueId
- dataSource status, pluginId, lastSyncedAt
- status: live, closed, resolved, disputed

Each PluginStatus must store:

- pluginId, pluginName
- status: connected, syncing, failed, mock
- lastSyncedAt
- importedCount
- last error if failed

### Required API Endpoints

Auth:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

Markets:

- GET /api/markets
- GET /api/markets/:id
- POST /api/markets/create
- POST /api/markets/sync
- POST /api/markets/:id/resolve

Bets:

- POST /api/bets
- GET /api/markets/:id/activity

Comments:

- GET /api/markets/:id/comments
- POST /api/markets/:id/comments
- POST /api/comments/:id/upvote

Friends:

- GET /api/users/search?q=
- POST /api/friends/request
- POST /api/friends/accept
- POST /api/friends/reject
- POST /api/friends/cancel

Leagues:

- GET /api/leagues
- POST /api/leagues
- GET /api/leagues/:id
- POST /api/leagues/:id/join
- POST /api/leagues/:id/invite
- DELETE /api/leagues/:id/leave

Plugin Status:

- GET /api/plugins/status
- POST /api/plugins/test-sync

### Community Market Resolution

Community markets must have clear resolution criteria before creation. When a community market closes, the creator can propose an outcome with proof/source. If users dispute it, mark the market as disputed and require admin/system resolution or refund. Do not silently choose a winner.

## 7. Acceptance Criteria

- Existing GameBlink design preserved without alterations
- Login button visible when logged out
- Sign Up button visible when logged out
- User balance displayed after login
- Guest mode functional with 500 starter coins
- Create Market button visible on Home page
- Community market creation functional
- Created markets appear in market list
- Betting functional on created markets
- Discussion/forum section present on each market
- Comment posting functional for logged-in users
- Plugin 775 news context displayed when available
- AI Search summary displayed when available
- Friends page search by username/user ID/city functional
- Add Friend button operational
- Pending incoming requests visible
- Pending outgoing requests visible
- Accept/reject friend request functional
- Friends roster updates correctly
- Create League button visible on Leagues page
- Create League modal functional
- Public/private league creation operational
- Friend invitation to league functional
- Public league join functional
- Private league invite/code requirement enforced
- League leaderboard operational
- Plugin status panel accessible
- Plugin 757 status visible
- Plugin 859 import status visible
- Market cards display source/plugin badges
- Bet Details page shows data source and last sync timestamp
- Real-time price updates attempted every 6 seconds
- Fallback/mock data clearly labeled when plugins fail
- No real-money features present
- No crypto wallet functionality
- No deposit or withdrawal functionality
- Live UI elements functional: ticker, price ticks, activity feed, confetti, flame streaks

## 8. Out of Scope for Current Release

- Real-money betting, deposits, withdrawals
- Cryptocurrency wallet integration
- KYC verification processes
- Payment processing systems
- Cashout functionality
- Multi-language UI beyond Indonesian/English mixed interface
- Advanced market analytics dashboards
- Mobile native applications (focus on web responsive design)
- Third-party social media integrations beyond basic sharing
- Advanced AI-powered market predictions
- Historical data export functionality
- Custom notification preferences beyond default settings
- Market maker or liquidity provider roles
- Advanced charting tools beyond sparklines and basic price charts
- API access for third-party developers
