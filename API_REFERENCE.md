# Trail Painter Duel - API Reference

## Supabase Integration

### Database Schema

#### `profiles` Table
User profile information linked to Supabase Auth.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: UUID - Primary key, references auth.users
- `username`: TEXT - Unique player display name
- `avatar_url`: TEXT - Optional profile picture URL
- `wins`: INTEGER - Number of matches won
- `losses`: INTEGER - Number of matches lost
- `total_matches`: INTEGER - Total games played
- `created_at`: TIMESTAMP - Account creation time
- `updated_at`: TIMESTAMP - Last profile update

#### `game_rooms` Table
Active game rooms and their current state.

```sql
CREATE TABLE game_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id),
  guest_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('waiting', 'ready', 'playing', 'finished')) DEFAULT 'waiting',
  game_state JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: UUID - Primary key, auto-generated
- `room_code`: TEXT - 6-character unique room identifier
- `host_id`: UUID - References profiles table, room creator
- `guest_id`: UUID - References profiles table, joining player
- `status`: TEXT - Current room state (waiting/ready/playing/finished)
- `game_state`: JSONB - Serialized game state object
- `created_at`: TIMESTAMP - Room creation time
- `updated_at`: TIMESTAMP - Last state update

#### `matches` Table
Completed game records and statistics.

```sql
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES game_rooms(id),
  player1_id UUID REFERENCES profiles(id),
  player2_id UUID REFERENCES profiles(id),
  winner_id UUID REFERENCES profiles(id),
  player1_score INTEGER NOT NULL,
  player2_score INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: UUID - Primary key, auto-generated
- `room_id`: UUID - References originating game room
- `player1_id`: UUID - First player profile reference
- `player2_id`: UUID - Second player profile reference
- `winner_id`: UUID - Winning player (nullable for ties)
- `player1_score`: INTEGER - Player 1 final territory count
- `player2_score`: INTEGER - Player 2 final territory count
- `duration`: INTEGER - Match duration in seconds
- `completed_at`: TIMESTAMP - Match completion time

### Realtime Channels

#### Game Room Channel
**Channel Name:** `game_room_{room_id}`

**Events:**
- `player_move`: Player position updates
- `game_state_update`: Full game state synchronization
- `game_start`: Match initialization
- `game_end`: Match completion
- `player_disconnect`: Player left the game

**Payload Structure:**
```typescript
interface PlayerMoveEvent {
  type: 'player_move';
  payload: {
    playerId: string;
    position: { x: number; y: number };
    timestamp: number;
  };
}

interface GameStateUpdateEvent {
  type: 'game_state_update';
  payload: {
    gameState: GameState;
    timestamp: number;
  };
}
```

### Row Level Security (RLS) Policies

#### Profiles Table
```sql
-- Users can read all profiles
CREATE POLICY "Profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

#### Game Rooms Table
```sql
-- Anyone can read game rooms
CREATE POLICY "Game rooms are viewable by everyone"
ON game_rooms FOR SELECT
USING (true);

-- Authenticated users can create game rooms
CREATE POLICY "Authenticated users can create game rooms"
ON game_rooms FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Room participants can update game rooms
CREATE POLICY "Room participants can update game rooms"
ON game_rooms FOR UPDATE
USING (
  auth.uid() = host_id OR 
  auth.uid() = guest_id
);
```

#### Matches Table
```sql
-- Anyone can read match history
CREATE POLICY "Matches are viewable by everyone"
ON matches FOR SELECT
USING (true);

-- Only the system can insert matches
CREATE POLICY "System can create match records"
ON matches FOR INSERT
WITH CHECK (auth.role() = 'authenticated');
```

## Client-Side API

### Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Authentication Service

#### `signUp(email: string, password: string, username: string)`
Creates a new user account with profile.

**Parameters:**
- `email`: User's email address
- `password`: Account password
- `username`: Unique display name

**Returns:** `Promise<AuthResponse>`

**Example:**
```typescript
const result = await authService.signUp(
  'player@example.com',
  'password123',
  'PlayerOne'
);
```

#### `signIn(email: string, password: string)`
Authenticates existing user.

**Parameters:**
- `email`: User's email address
- `password`: Account password

**Returns:** `Promise<AuthResponse>`

#### `signOut()`
Ends current user session.

**Returns:** `Promise<void>`

#### `getCurrentUser()`
Retrieves current authenticated user.

**Returns:** `User | null`

### Game Service

#### `createRoom(hostId: string)`
Creates a new game room.

**Parameters:**
- `hostId`: UUID of room creator

**Returns:** `Promise<GameRoom>`

**Example:**
```typescript
const room = await gameService.createRoom(user.id);
console.log(`Room code: ${room.room_code}`);
```

#### `joinRoom(roomCode: string, guestId: string)`
Joins existing game room.

**Parameters:**
- `roomCode`: 6-character room identifier
- `guestId`: UUID of joining player

**Returns:** `Promise<GameRoom>`

#### `updateGameState(roomId: string, gameState: GameState)`
Updates room's game state.

**Parameters:**
- `roomId`: Room UUID
- `gameState`: Complete game state object

**Returns:** `Promise<void>`

#### `getRoom(roomId: string)`
Retrieves room information.

**Parameters:**
- `roomId`: Room UUID

**Returns:** `Promise<GameRoom | null>`

#### `saveMatch(matchData: MatchResult)`
Records completed match results.

**Parameters:**
- `matchData`: Match outcome and statistics

**Returns:** `Promise<void>`

### Real-time Hooks

#### `useGameSync(roomId: string)`
Manages real-time game state synchronization.

**Parameters:**
- `roomId`: Room UUID to subscribe to

**Returns:**
```typescript
{
  gameState: GameState | null;
  updateGameState: (newState: GameState) => void;
  broadcastMove: (position: Position) => void;
  isConnected: boolean;
}
```

**Usage:**
```typescript
const {
  gameState,
  updateGameState,
  broadcastMove,
  isConnected
} = useGameSync(roomId);
```

#### `useAuth()`
Manages authentication state.

**Returns:**
```typescript
{
  user: User | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}
```

## TypeScript Interfaces

### Core Game Types

```typescript
interface Position {
  x: number;
  y: number;
}

interface Player {
  id: string;
  username: string;
  color: string;
  position: Position;
  score: number;
}

interface GameState {
  players: [Player, Player];
  grid: number[][];
  gamePhase: 'waiting' | 'playing' | 'finished';
  timeRemaining: number;
  winner: string | null;
}

interface GameRoom {
  id: string;
  room_code: string;
  host_id: string;
  guest_id: string | null;
  status: 'waiting' | 'ready' | 'playing' | 'finished';
  game_state: GameState | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  wins: number;
  losses: number;
  total_matches: number;
  created_at: string;
  updated_at: string;
}

interface MatchResult {
  room_id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  duration: number;
}
```

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Variables

```bash
# Development
VITE_DEV_MODE=true
VITE_DEBUG_REALTIME=false
```

## Error Handling

### Common Error Types

```typescript
interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
```

**Error Codes:**
- `ROOM_NOT_FOUND`: Invalid room code
- `ROOM_FULL`: Room already has two players
- `UNAUTHORIZED`: Authentication required
- `NETWORK_ERROR`: Connection issues
- `GAME_ENDED`: Action attempted on finished game

### Error Handling Pattern

```typescript
try {
  const result = await gameService.joinRoom(roomCode, userId);
  // Handle success
} catch (error: any) {
  switch (error.code) {
    case 'ROOM_NOT_FOUND':
      setError('Room not found. Please check the code.');
      break;
    case 'ROOM_FULL':
      setError('This room is already full.');
      break;
    default:
      setError('An unexpected error occurred.');
  }
}
```

This API reference provides comprehensive documentation for integrating with and extending the Trail Painter Duel application.