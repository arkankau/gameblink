import HomePage from './pages/HomePage';
import MarketDetailPage from './pages/MarketDetailPage';
import CreateMarketPage from './pages/CreateMarketPage';
import FriendsPage from './pages/FriendsPage';
import LeaguesPage from './pages/LeaguesPage';
import LeaderboardPage from './pages/LeaderboardPage';
import DailyLoginPage from './pages/DailyLoginPage';
import type { ReactNode } from 'react';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  /** Accessible without login. Routes without this flag require authentication. Has no effect when RouteGuard is not in use. */
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Home',
    path: '/',
    element: <HomePage />,
    public: true,
  },
  {
    name: 'Market Detail',
    path: '/market/:id',
    element: <MarketDetailPage />,
    public: true,
  },
  {
    name: 'Create Market',
    path: '/create-market',
    element: <CreateMarketPage />,
    public: false,
  },
  {
    name: 'Friends',
    path: '/friends',
    element: <FriendsPage />,
    public: false,
  },
  {
    name: 'Leagues',
    path: '/leagues',
    element: <LeaguesPage />,
    public: true,
  },
  {
    name: 'Leaderboard',
    path: '/leaderboard',
    element: <LeaderboardPage />,
    public: true,
  },
  {
    name: 'Daily Login',
    path: '/daily',
    element: <DailyLoginPage />,
    public: false,
  },
];
