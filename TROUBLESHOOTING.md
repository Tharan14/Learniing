# Trail Painter Duel - Troubleshooting Guide

## Common Issues and Solutions

### 1. Application Won't Start

#### Issue: "Module not found" errors during development

**Symptoms:**
- Import errors in console
- Missing dependency warnings
- Build failures

**Solutions:**

1. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 18.0.0 or higher
   npm --version   # Should be 9.0.0 or higher
   ```

3. **Install missing dependencies:**
   ```bash
   npm install @supabase/supabase-js react-router-dom framer-motion
   ```

#### Issue: Environment variables not loading

**Symptoms:**
- Supabase connection errors
- "undefined" in network requests
- Authentication failures

**Solutions:**

1. **Check .env.local file exists:**
   ```bash
   ls -la .env.local
   ```

2. **Verify environment variable format:**
   ```bash
   # Correct format (no spaces around =)
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Restart development server:**
   ```bash
   npm run dev
   ```

### 2. Supabase Connection Issues

#### Issue: "Failed to fetch" errors

**Symptoms:**
- Network errors in console
- Authentication failures
- Database queries failing

**Solutions:**

1. **Verify Supabase project status:**
   - Check Supabase dashboard for project health
   - Ensure project is not paused
   - Verify billing status if applicable

2. **Test connection manually:**
   ```typescript
   // Add to a component for debugging
   useEffect(() => {
     supabase.from('profiles').select('*').limit(1)
       .then(response => console.log('Connection test:', response))
       .catch(error => console.error('Connection failed:', error));
   }, []);
   ```

3. **Check network/firewall:**
   - Disable VPN temporarily
   - Check corporate firewall settings
   - Try different network connection

#### Issue: RLS (Row Level Security) blocking queries

**Symptoms:**
- Empty results from database queries
- "Insufficient permissions" errors
- Authenticated requests failing

**Solutions:**

1. **Verify RLS policies:**
   ```sql
   -- Check existing policies
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

2. **Temporarily disable RLS for debugging:**
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   -- Remember to re-enable after testing!
   ```

3. **Check user authentication:**
   ```typescript
   const { data: { user } } = await supabase.auth.getUser();
   console.log('Current user:', user);
   ```

### 3. Real-time Synchronization Problems

#### Issue: Player movements not syncing between clients

**Symptoms:**
- Other player appears stationary
- Position updates delayed or missing
- "Connection lost" messages

**Solutions:**

1. **Check Realtime subscription status:**
   ```typescript
   const channel = supabase.channel('game_room_test')
     .on('broadcast', { event: 'player_move' }, (payload) => {
       console.log('Received movement:', payload);
     })
     .subscribe((status) => {
       console.log('Subscription status:', status);
     });
   ```

2. **Verify channel name consistency:**
   - Ensure both clients use identical channel names
   - Check for typos in room IDs
   - Confirm channel exists before subscribing

3. **Monitor WebSocket connection:**
   - Open browser DevTools → Network → WS
   - Look for WebSocket connection to Supabase
   - Check for connection drops or errors

#### Issue: High latency in real-time updates

**Symptoms:**
- Delayed player movements
- Jerky animation
- Score updates lag behind

**Solutions:**

1. **Reduce update frequency:**
   ```typescript
   // Use throttling for movement updates
   const throttledBroadcast = useCallback(
     throttle((position) => {
       channel.send({
         type: 'broadcast',
         event: 'player_move',
         payload: { position }
       });
     }, 100), // Limit to 10 updates per second
     [channel]
   );
   ```

2. **Optimize payload size:**
   ```typescript
   // Send only changed data
   const lastSentPosition = useRef<Position | null>(null);
   
   if (!lastSentPosition.current || 
       lastSentPosition.current.x !== position.x ||
       lastSentPosition.current.y !== position.y) {
     broadcastMove(position);
     lastSentPosition.current = position;
   }
   ```

3. **Check server location:**
   - Verify Supabase project region matches user location
   - Consider CDN or edge locations

### 4. Game Logic Issues

#### Issue: Territory painting not working correctly

**Symptoms:**
- Grid cells not changing color
- Territory counts incorrect
- Visual artifacts on grid

**Solutions:**

1. **Debug grid state:**
   ```typescript
   // Add grid visualization
   useEffect(() => {
     console.table(gameState?.grid);
   }, [gameState?.grid]);
   ```

2. **Check coordinate bounds:**
   ```typescript
   const isValidPosition = (x: number, y: number) => {
     return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
   };
   ```

3. **Verify color mapping:**
   ```typescript
   const getCellColor = (value: number) => {
     switch (value) {
       case 0: return 'bg-gray-100'; // Empty
       case 1: return 'bg-blue-500';  // Player 1
       case 2: return 'bg-red-500';   // Player 2
       default: return 'bg-gray-100';
     }
   };
   ```

#### Issue: Timer not working properly

**Symptoms:**
- Timer doesn't start
- Timer counts incorrectly
- Game doesn't end when timer reaches zero

**Solutions:**

1. **Check timer initialization:**
   ```typescript
   useEffect(() => {
     if (gameState?.gamePhase === 'playing') {
       const timer = setInterval(() => {
         setTimeRemaining(prev => {
           if (prev <= 1) {
             endGame();
             return 0;
           }
           return prev - 1;
         });
       }, 1000);
       
       return () => clearInterval(timer);
     }
   }, [gameState?.gamePhase]);
   ```

2. **Synchronize timer between clients:**
   - Use server timestamp as authoritative source
   - Calculate remaining time based on start time
   - Handle clock drift between clients

### 5. Authentication Problems

#### Issue: Users can't sign up or sign in

**Symptoms:**
- "Invalid credentials" errors
- Email confirmation not sent
- Redirect loops after authentication

**Solutions:**

1. **Check Supabase Auth settings:**
   - Verify email templates are configured
   - Check if email confirmation is required
   - Ensure redirect URLs are whitelisted

2. **Test with different email providers:**
   - Try Gmail, Outlook, etc.
   - Check spam folders for confirmation emails
   - Use different email format (no special characters)

3. **Debug authentication state:**
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     console.log('Auth event:', event, session);
   });
   ```

#### Issue: Profile creation fails after signup

**Symptoms:**
- User authenticated but no profile exists
- Username conflicts
- Profile data not saved

**Solutions:**

1. **Check database trigger:**
   ```sql
   -- Verify profile creation trigger exists
   SELECT * FROM information_schema.triggers 
   WHERE event_object_table = 'profiles';
   ```

2. **Manual profile creation:**
   ```typescript
   const createProfile = async (user: User, username: string) => {
     const { error } = await supabase
       .from('profiles')
       .upsert({
         id: user.id,
         username: username,
         avatar_url: null,
         wins: 0,
         losses: 0,
         total_matches: 0
       });
     
     if (error) throw error;
   };
   ```

### 6. Deployment Issues

#### Issue: Build fails during deployment

**Symptoms:**
- TypeScript compilation errors
- Missing environment variables
- Asset loading failures

**Solutions:**

1. **Check build locally:**
   ```bash
   npm run build
   npm run preview
   ```

2. **Fix TypeScript errors:**
   ```bash
   npx tsc --noEmit  # Check types without building
   ```

3. **Set environment variables in deployment platform:**
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Add all VITE_ prefixed variables

#### Issue: App works locally but fails in production

**Symptoms:**
- White screen in production
- API calls failing
- Assets not loading

**Solutions:**

1. **Check production console:**
   - Open browser DevTools on deployed site
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Verify environment variables:**
   ```typescript
   // Add debug logging
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   console.log('Environment:', import.meta.env.MODE);
   ```

3. **Update Supabase URL whitelist:**
   - Add production domain to Supabase Auth settings
   - Update CORS settings if needed
   - Check API key permissions

## Performance Optimization

### Reduce Bundle Size

1. **Analyze bundle:**
   ```bash
   npm run build -- --analyze
   ```

2. **Code splitting:**
   ```typescript
   // Lazy load pages
   const GameRoomPage = lazy(() => import('./pages/GameRoomPage'));
   const LobbyPage = lazy(() => import('./pages/LobbyPage'));
   ```

3. **Remove unused dependencies:**
   ```bash
   npm ls --depth=0  # List direct dependencies
   npm uninstall unused-package
   ```

### Optimize Real-time Performance

1. **Debounce frequent updates:**
   ```typescript
   const debouncedUpdateScore = useMemo(
     () => debounce(updateScore, 100),
     []
   );
   ```

2. **Minimize re-renders:**
   ```typescript
   // Memoize expensive calculations
   const territoryCount = useMemo(() => {
     return calculateTerritory(gameState.grid);
   }, [gameState.grid]);
   ```

3. **Optimize grid rendering:**
   ```typescript
   // Use React.memo for grid cells
   const GridCell = React.memo(({ value, x, y }: GridCellProps) => {
     return (
       <div className={`grid-cell ${getCellColor(value)}`} />
     );
   });
   ```

## Getting Help

### Before Asking for Help

1. **Check browser console** for error messages
2. **Review this troubleshooting guide** for similar issues
3. **Test in different browser** or incognito mode
4. **Verify environment setup** matches deployment guide

### Where to Get Help

1. **Supabase Documentation:**
   - [Auth Guide](https://supabase.com/docs/guides/auth)
   - [Realtime Guide](https://supabase.com/docs/guides/realtime)
   - [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

2. **React/Vite Resources:**
   - [Vite Documentation](https://vitejs.dev/guide/)
   - [React Documentation](https://react.dev)
   - [TypeScript Handbook](https://www.typescriptlang.org/docs/)

3. **Community Support:**
   - [Supabase Discord](https://discord.supabase.com)
   - [React Community](https://reactjs.org/community/support.html)
   - Stack Overflow (use appropriate tags)

### Information to Include When Asking for Help

1. **Error messages** (full stack trace)
2. **Steps to reproduce** the issue
3. **Browser and version** you're using
4. **Environment details** (development vs production)
5. **Code snippets** showing the problematic area
6. **Expected vs actual behavior**

This troubleshooting guide should help resolve most common issues encountered during development and deployment of Trail Painter Duel.