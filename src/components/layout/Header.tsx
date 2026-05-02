import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { User, LogOut, Users, Trophy, Flame, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function Header() {
  const { user, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Markets' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/friends', label: 'Friends' },
    { to: '/leagues', label: 'Leagues' },
    { to: '/daily', label: 'Daily Login' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display text-2xl">GAMEBLINK</span>
            </Link>

            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 md:flex">
                  <span className="text-xl">🪙</span>
                  <span className="font-mono text-sm font-semibold text-gb-coin">
                    {user.balance.toLocaleString()}
                  </span>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <span className="text-xl">{user.avatar}</span>
                      <span className="hidden md:inline">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/friends" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Friends
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/leagues" className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        Leagues
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/daily" className="flex items-center gap-2">
                        <Flame className="h-4 w-4" />
                        Daily Login
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden md:inline-flex"
                >
                  Login
                </Button>
                <Button
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  className="hidden md:inline-flex"
                >
                  Sign Up
                </Button>
              </>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-64">
                <div className="flex flex-col gap-4 pt-8">
                  {user && (
                    <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <span className="text-2xl">{user.avatar}</span>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="font-mono text-sm text-gb-coin">
                          🪙 {user.balance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm font-medium"
                    >
                      {link.label}
                    </Link>
                  ))}

                  {!user && (
                    <>
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setAuthModalOpen(true);
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        Login
                      </Button>
                      <Button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setAuthModalOpen(true);
                        }}
                        className="w-full"
                      >
                        Sign Up
                      </Button>
                    </>
                  )}

                  {user && (
                    <Button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Logout
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
}
