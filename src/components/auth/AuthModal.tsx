import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INDONESIAN_CITIES = [
  'Jakarta',
  'Tangerang',
  'Bandung',
  'Surabaya',
  'Bali',
  'Medan',
  'Semarang',
  'Makassar',
  'Palembang',
  'Yogyakarta',
];

const COUNTRIES = [
  { name: 'Indonesia', code: 'ID' },
  { name: 'Singapore', code: 'SG' },
  { name: 'Malaysia', code: 'MY' },
  { name: 'Thailand', code: 'TH' },
  { name: 'Philippines', code: 'PH' },
  { name: 'Vietnam', code: 'VN' },
  { name: 'United States', code: 'US' },
  { name: 'United Kingdom', code: 'GB' },
  { name: 'Australia', code: 'AU' },
  { name: 'Other', code: 'XX' },
];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  ID: ['Tangerang', 'Jakarta', 'Bandung', 'Surabaya', 'Bali', 'Medan', 'Semarang', 'Makassar', 'Palembang', 'Yogyakarta'],
  SG: ['Singapore'],
  MY: ['Kuala Lumpur', 'Johor Bahru', 'Penang', 'Malacca', 'Ipoh'],
  TH: ['Bangkok', 'Chiang Mai', 'Phuket', 'Pattaya'],
  PH: ['Manila', 'Quezon City', 'Cebu', 'Davao'],
  VN: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Nha Trang'],
  US: ['New York', 'Los Angeles', 'San Francisco', 'Chicago', 'Miami'],
  GB: ['London', 'Manchester', 'Birmingham', 'Edinburgh'],
  AU: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
};

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupCity, setSignupCity] = useState('');
  const [signupCountry, setSignupCountry] = useState('Indonesia');
  const [signupCountryCode, setSignupCountryCode] = useState('ID');

  const handleCountryChange = (countryName: string, countryCode: string) => {
    setSignupCountry(countryName);
    setSignupCountryCode(countryCode);

    // Get cities for the new country
    const cities = CITIES_BY_COUNTRY[countryCode] ?? [];
    
    // Reset city if current city is not valid for new country
    if (!cities.includes(signupCity)) {
      setSignupCity(cities[0] ?? '');
    }
  };

  const getAvailableCities = () => {
    return CITIES_BY_COUNTRY[signupCountryCode] ?? [];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(loginEmail, loginPassword);
      toast.success('Welcome back!');
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupUsername || !signupCity || !signupCountry) {
      toast.error('Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await signUp(
        signupEmail,
        signupPassword,
        signupUsername,
        signupCity,
        signupCountry,
        signupCountryCode
      );
      toast.success('Account created! You have 1,000 virtual coins.');
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await continueAsGuest();
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as Error;
      toast.error(err.message || 'Failed to continue as guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">GAMEBLINK</DialogTitle>
          <p className="text-sm text-muted-foreground">No money · all skill.</p>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  className="px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="px-3"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <Input
                  id="signup-username"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  required
                  className="px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  className="px-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-country">Country</Label>
                <Select
                  value={signupCountry}
                  onValueChange={(value) => {
                    const country = COUNTRIES.find((c) => c.name === value);
                    if (country) {
                      handleCountryChange(country.name, country.code);
                    }
                  }}
                >
                  <SelectTrigger id="signup-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.name}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-city">City</Label>
                {getAvailableCities().length > 0 ? (
                  <Select value={signupCity} onValueChange={setSignupCity}>
                    <SelectTrigger id="signup-city">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableCities().map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="signup-city"
                    value={signupCity}
                    onChange={(e) => setSignupCity(e.target.value)}
                    placeholder="Enter city"
                    className="px-3"
                  />
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button variant="outline" onClick={handleGuest} disabled={loading} className="w-full">
          Continue as Guest
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Virtual coins only · No real money
        </p>
      </DialogContent>
    </Dialog>
  );
}
