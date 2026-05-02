# Auth Lock Debugging Guide

## Quick Diagnosis

If you see auth lock errors, check these in order:

### 1. Check Initialization Count

Add this to `AuthContext.tsx` temporarily:

```typescript
useEffect(() => {
  console.log('[Auth] useEffect triggered, initialized:', initializedRef.current);
  
  if (initializedRef.current) {
    console.log('[Auth] Skipping duplicate initialization');
    return;
  }
  
  console.log('[Auth] Starting initialization');
  initializedRef.current = true;
  
  // ... rest of code
}, []);
```

**Expected output on first load**: 
```
[Auth] useEffect triggered, initialized: false
[Auth] Starting initialization
```

**If you see this (BAD)**:
```
[Auth] useEffect triggered, initialized: false
[Auth] Starting initialization
[Auth] useEffect triggered, initialized: true
[Auth] Skipping duplicate initialization
```

This is normal in React Strict Mode. The guard is working correctly.

**If you see multiple "Starting initialization" (BAD)**:
```
[Auth] useEffect triggered, initialized: false
[Auth] Starting initialization
[Auth] useEffect triggered, initialized: false
[Auth] Starting initialization
```

This means `initializedRef` is being reset. Check if:
- Multiple `AuthProvider` instances exist
- `AuthProvider` is remounting unexpectedly

---

### 2. Check Profile Fetch Count

Add this to `fetchProfileOnce`:

```typescript
async function fetchProfileOnce(userId: string) {
  console.log('[Profile] Fetch requested for:', userId);
  console.log('[Profile] In-flight:', profileFetchInFlightRef.current);
  
  if (!userId) return;

  if (profileFetchInFlightRef.current === userId) {
    console.log('[Profile] Skipping duplicate fetch');
    return;
  }

  console.log('[Profile] Starting fetch');
  profileFetchInFlightRef.current = userId;

  try {
    // ... fetch code
  } finally {
    console.log('[Profile] Fetch complete');
    profileFetchInFlightRef.current = null;
  }
}
```

**Expected output on login**:
```
[Profile] Fetch requested for: abc-123
[Profile] In-flight: null
[Profile] Starting fetch
[Profile] Fetch complete
```

**If you see this (BAD)**:
```
[Profile] Fetch requested for: abc-123
[Profile] In-flight: null
[Profile] Starting fetch
[Profile] Fetch requested for: abc-123
[Profile] In-flight: abc-123
[Profile] Skipping duplicate fetch
```

This is actually GOOD - the deduplication is working.

**If you see this (BAD)**:
```
[Profile] Fetch requested for: abc-123
[Profile] In-flight: null
[Profile] Starting fetch
[Profile] Fetch requested for: abc-123
[Profile] In-flight: null
[Profile] Starting fetch
```

This means `profileFetchInFlightRef` is being reset between calls. Check if:
- Multiple `AuthProvider` instances exist
- `fetchProfileOnce` is being recreated on each render

---

### 3. Check Auth State Change Count

Add this to `onAuthStateChange`:

```typescript
let authChangeCount = 0;

supabase.auth.onAuthStateChange((_event, nextSession) => {
  authChangeCount++;
  console.log('[Auth] State change #', authChangeCount, 'event:', _event);
  
  setSession(nextSession);
  setSupabaseUser(nextSession?.user ?? null);

  setTimeout(() => {
    console.log('[Auth] Scheduling profile fetch for:', nextSession?.user?.id);
    if (nextSession?.user?.id) {
      fetchProfileOnce(nextSession.user.id);
    } else {
      profileFetchInFlightRef.current = null;
      setUser(null);
    }
  }, 0);
});
```

**Expected output on first load (no session)**:
```
[Auth] State change # 1 event: INITIAL_SESSION
```

**Expected output on first load (with session)**:
```
[Auth] State change # 1 event: INITIAL_SESSION
[Auth] Scheduling profile fetch for: abc-123
```

**Expected output on login**:
```
[Auth] State change # 2 event: SIGNED_IN
[Auth] Scheduling profile fetch for: abc-123
```

**If you see many rapid state changes (BAD)**:
```
[Auth] State change # 1 event: INITIAL_SESSION
[Auth] State change # 2 event: INITIAL_SESSION
[Auth] State change # 3 event: INITIAL_SESSION
```

This means multiple subscriptions exist. Check if:
- Multiple `AuthProvider` instances exist
- Subscription cleanup is not working

---

### 4. Check Supabase Client Count

Add this to `src/db/supabase.ts`:

```typescript
console.log('[Supabase] Creating client instance');

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  // ... config
});

console.log('[Supabase] Client instance created');
```

**Expected output**:
```
[Supabase] Creating client instance
[Supabase] Client instance created
```

This should appear only ONCE in the console, ever.

**If you see it multiple times (BAD)**:
```
[Supabase] Creating client instance
[Supabase] Client instance created
[Supabase] Creating client instance
[Supabase] Client instance created
```

This means the module is being re-imported. Check if:
- Hot module reload is causing re-imports (restart dev server)
- Multiple copies of the file exist
- Import path is inconsistent (`@/db/supabase` vs `../db/supabase`)

---

### 5. Check for Multiple AuthProviders

Search the codebase:

```bash
grep -r "AuthProvider" src/
```

**Expected output**:
```
src/App.tsx:import { AuthProvider } from '@/contexts/AuthContext';
src/App.tsx:      <AuthProvider>
src/App.tsx:      </AuthProvider>
src/contexts/AuthContext.tsx:export function AuthProvider({ children }: { children: ReactNode }) {
```

**If you see AuthProvider in multiple places (BAD)**:
- Remove duplicate providers
- Ensure only one provider wraps the app

---

### 6. Check for Direct Auth Calls in Pages

Search for direct auth calls:

```bash
grep -r "supabase.auth.get" src/pages/
```

**Expected output**:
```
[No results]
```

**If you see results (BAD)**:
- Remove direct auth calls from pages
- Use `useAuth()` hook instead

---

## Common Issues and Solutions

### Issue: "Lock not released within 5000ms"

**Cause**: Multiple simultaneous auth operations

**Solution**: 
1. Check initialization count (should be 1)
2. Check profile fetch deduplication (should skip duplicates)
3. Check auth state change count (should be reasonable)

### Issue: "Lock broken by another request with the 'steal' option"

**Cause**: One operation forcefully took the lock from another

**Solution**:
1. Ensure only one Supabase client exists
2. Ensure only one AuthProvider exists
3. Ensure initialization guard is working
4. Ensure profile fetch deduplication is working

### Issue: AbortError in console

**Cause**: An async operation was aborted (usually by navigation or unmount)

**Solution**: This is normal and handled. If it's frequent:
1. Check if components are unmounting unexpectedly
2. Check if navigation is happening during async operations
3. Ensure `mounted` check is working

### Issue: Profile doesn't load

**Cause**: Profile fetch is being skipped or failing

**Solution**:
1. Check profile fetch logs
2. Check if user ID is valid
3. Check if RLS policies allow access
4. Check if profile row exists in database

### Issue: Auth state doesn't persist on refresh

**Cause**: Session storage is not working

**Solution**:
1. Check if `persistSession: true` in Supabase config
2. Check if localStorage is available
3. Check if `storageKey` is consistent
4. Check browser localStorage for `gameblink-auth-token`

---

## Emergency Recovery

If all else fails:

### 1. Clear All Auth State

```typescript
// In browser console
localStorage.removeItem('gameblink-auth-token');
localStorage.clear();
location.reload();
```

### 2. Force Sign Out

```typescript
// In browser console
import { supabase } from '@/db/supabase';
await supabase.auth.signOut();
location.reload();
```

### 3. Check Supabase Dashboard

1. Go to Supabase dashboard
2. Check Authentication > Users
3. Verify user exists
4. Check Database > users table
5. Verify profile row exists

### 4. Restart Dev Server

```bash
# Kill dev server
# Clear node_modules/.vite cache
rm -rf node_modules/.vite
# Restart
npm run dev
```

---

## Verification Script

Run this in browser console to verify auth state:

```javascript
// Check localStorage
console.log('Auth token:', localStorage.getItem('gameblink-auth-token'));

// Check Supabase client
console.log('Supabase client exists:', !!window.supabase);

// Check auth state (if you expose it for debugging)
console.log('Auth state:', {
  user: window.__authUser,
  session: window.__authSession,
  loading: window.__authLoading,
});
```

To expose auth state for debugging, add this to `AuthContext.tsx`:

```typescript
// Only in development
if (import.meta.env.DEV) {
  (window as any).__authUser = user;
  (window as any).__authSession = session;
  (window as any).__authLoading = loading;
}
```

---

## Success Criteria

After fixes, you should see:

✅ No "Lock not released" errors  
✅ No "Lock broken" errors  
✅ No repeated AbortErrors  
✅ Auth initializes once  
✅ Profile fetches once per user  
✅ Auth state changes are reasonable  
✅ Login works  
✅ Logout works  
✅ Refresh works  
✅ Guest mode works  

---

## When to Ask for Help

If after following this guide:

1. Auth lock errors still occur
2. Multiple "Starting initialization" logs appear
3. Profile fetch deduplication is not working
4. Auth state changes are excessive (>5 on first load)
5. Supabase client is created multiple times

Then there may be a deeper issue with:
- React version compatibility
- Supabase client version compatibility
- Build tool configuration
- Browser extension interference

Check:
- React version: Should be 18.x
- Supabase client version: Should be latest stable
- Browser: Try incognito mode (no extensions)
- Network: Check for proxy/VPN interference
