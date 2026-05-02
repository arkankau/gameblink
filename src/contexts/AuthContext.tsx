import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { User } from '@/types/types';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string, city: string, country: string, countryCode: string, avatar?: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const initializedRef = useRef(false);
  const profileFetchInFlightRef = useRef<string | null>(null);

  async function fetchProfileOnce(userId: string) {
    if (!userId) return;

    if (profileFetchInFlightRef.current === userId) {
      return;
    }

    profileFetchInFlightRef.current = userId;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setUser(null);
        return;
      }

      setUser(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('Profile fetch aborted safely');
        return;
      }

      console.error('Unexpected profile fetch error:', err);
      setUser(null);
    } finally {
      profileFetchInFlightRef.current = null;
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await fetchProfileOnce(authUser.id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('User refresh aborted safely');
        return;
      }
      console.error('Error refreshing user:', err);
    }
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('getSession error:', error);
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          return;
        }

        const currentSession = data.session;
        setSession(currentSession);
        setSupabaseUser(currentSession?.user ?? null);

        if (currentSession?.user?.id) {
          await fetchProfileOnce(currentSession.user.id);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.warn('Auth init aborted safely');
        } else {
          console.error('Auth initialization error:', err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setSupabaseUser(nextSession?.user ?? null);

      setTimeout(() => {
        if (nextSession?.user?.id) {
          fetchProfileOnce(nextSession.user.id);
        } else {
          profileFetchInFlightRef.current = null;
          setUser(null);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await fetchProfileOnce(data.user.id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Sign in was interrupted, please try again');
      }
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    city: string,
    country: string,
    countryCode: string,
    avatar?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          username,
          email,
          avatar: avatar || '👤',
          balance: 1000,
          city,
          country,
          country_code: countryCode,
          is_guest: false,
        });

        if (profileError) throw profileError;

        await fetchProfileOnce(data.user.id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Sign up was interrupted, please try again');
      }
      throw err;
    }
  };

  const continueAsGuest = async () => {
    try {
      const guestUsername = `guest_${Math.random().toString(36).substring(7)}`;
      const guestEmail = `${guestUsername}@guest.gameblink.local`;
      const guestPassword = Math.random().toString(36).substring(2, 15);

      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('users').insert({
          id: data.user.id,
          username: guestUsername,
          email: guestEmail,
          avatar: '👻',
          balance: 500,
          city: 'Unknown',
          country: 'Unknown',
          country_code: 'XX',
          is_guest: true,
        });

        if (profileError) {
          toast.error('Failed to create guest profile');
          throw profileError;
        }

        await fetchProfileOnce(data.user.id);
        toast.success('Welcome, Guest! You have 500 virtual coins to start.');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        toast.error('Guest creation was interrupted, please try again');
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      profileFetchInFlightRef.current = null;
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, supabaseUser, session, loading, signIn, signUp, signOut, continueAsGuest, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

