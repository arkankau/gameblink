# GameBlink - Future Enhancements

## Completed Core Features ✅
- Full authentication system with guest mode
- Home page with market listings and category filters
- Market detail pages with betting functionality
- Market creation for community markets
- Friends system with search and friend requests
- Leagues system with public/private leagues
- Leaderboard with multiple scopes and timeframes
- Daily login rewards with 7-day streak
- Complete database schema with RLS policies
- GameBlink design system (colors, fonts, animations)

## Future Enhancements (Not Yet Implemented)

### 1. Plugin & Data Status Panel
Create a dev/admin page at `/plugins` to show:
- Status of all MeDo plugins (Weather, News, Stock, Forex, etc.)
- Last sync timestamps
- Error messages if plugins fail
- Mock fallback indicators

### 2. Edge Functions for External APIs
Implement Supabase Edge Functions for:
- **Weather API**: Fetch Indonesian city weather data
- **News API**: Get news context for market discussions
- **Stock API**: Pull real-time stock prices
- **Forex API**: Get currency exchange rates
- **Historical Data API**: Fetch price history for charts

Each Edge Function should:
- Include proper CORS headers
- Handle errors gracefully
- Fall back to mock data with clear labeling
- Use the INTEGRATIONS_API_KEY from environment

### 3. Real-Time System
Implement Supabase Realtime subscriptions for:
- Market price updates (every 6 seconds)
- Activity feed updates when new bets are placed
- Leaderboard updates after bet resolutions
- Online status tracking (15-minute window)
- Comment updates in market discussions

Use Supabase Realtime channels:
```typescript
const channel = supabase
  .channel('market-updates')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'markets' }, (payload) => {
    // Update market prices in UI
  })
  .subscribe();
```

### 4. Additional Features to Consider
- League detail pages with member leaderboards
- User profile pages
- Bet history page
- Market resolution system for community markets
- Notification system for friend requests and league invites
- Advanced charts with historical price data
- Mobile app optimization
- PWA support

## Notes
- All core functionality is working with mock data
- Database is fully set up with proper RLS policies
- Authentication and authorization are complete
- UI follows GameBlink design system
- Virtual coins only - no real money features
