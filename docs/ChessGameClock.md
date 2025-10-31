# Chess Game Clock

## Overview

The chess game clock tracks time for each player during a game. The backend manages clock state and emits updates to clients, while clients display the time locally.

## Architecture

### Service: `ChessClockService`

Location: `backend/src/services/chessClockService.ts`

The service manages clock state for all active game rooms using an in-memory Map keyed by room ID.

### Clock State

```typescript
type ChessClockState = {
    white: {
        timeRemainingMs: number;
        isActive: boolean;
    };
    black: {
        timeRemainingMs: number;
        isActive: boolean;
    };
    lastUpdatedTimeMs: number | null; // epoch ms of last tick
    baseTimeMs: number; // initial time for resets
    incrementMs: number; // Fischer increment per move
    isPaused: boolean;
};
```

## How It Works

### 1. On-Demand Time Calculation (No Intervals)

Instead of using timers that decrement every second, the service calculates elapsed time only when needed:

- When the clock starts/switches after a move
- When reading state (service call updates based on `Date.now()`)
- When checking for time expiration

Server updates time on read/switch via a pure function and the last timestamp:

- Base: `remaining = remaining - (nowMs - lastUpdatedTimeMs)`
- On switch: add `incrementMs` to the player who just moved

This approach:

- Reduces server load (no constant updates)
- Ensures accuracy (calculation based on Date objects)
- Simplifies state management (no cleanup of intervals)

### 2. Fischer Increment

The service implements Fischer increment rules:

- After completing a move, the increment is added to the player's remaining time
- Increment is NOT added if the player's time expires before completing the move

### 3. Immutability

All state updates create new objects using deep copies, preventing accidental mutations and making state changes predictable.

## Lifecycle

### Game Start (Room Full)

Socket: `wait_for_game` (backend/src/sockets/chessGameRoomSocket.ts)

```typescript
// When second player joins
chessGameService.createChessGameForRoom(roomId);
gameRoomService.startNewGameInRoom(roomId);
if (timeControl) {
    chessClockService.initializeClockForRoom(roomId, timeControl);
}
io.to(gameRoomTarget).emit('game_room_ready');
```

Clock is initialized in **paused** state with:

- Both players have full time
- No clock is active
- `lastUpdatedTime` is null

### First Move (Clock Start)

The clock remains paused until the first move is made. When white makes the first move, black's clock becomes active.
If there is an increment, it is added to white's clock after the move is made.

### Each Move (Clock Switch + Timeout Check)

Socket: `move_piece` (backend/src/sockets/chessGameRoomSocket.ts)

Flow:

1. Early timeout check before applying the move

```typescript
const expired = computeGameStateBasedOnClock(clockState, chessGame.boardState.board);
if (expired) {
    clockState = chessClockService.pauseClock(roomId);
    chessGameService.endGameForRoom(roomId, expired);
    io.to(gameRoomTarget).emit('game_ended', {
        reason: expired.status, // e.g. 'time-out' | 'insufficient-material'
        winner: expired.winner,
        updatedScores: gameRoomService.updatePlayerScores(roomId, expiredClockGameState),
    });
    io.to(gameRoomTarget).emit('clock_update', { clockState });
    return;
}
```

2. Apply the move and check for normal end

3. Start/switch clock and broadcast

```typescript
clockState = clockState.isPaused
    ? chessClockService.startClock(roomId, nextActiveColor)
    : chessClockService.switchClock(roomId, nextActiveColor);
io.to(gameRoomTarget).emit('clock_update', { clockState });
```

The `switchClock` method:

1. Calculates elapsed time for the active clock
2. Deducts elapsed time from active player's remaining time
3. Adds increment to active player's time
4. Switches which clock is active
5. Updates `lastUpdatedTime` to now

### Player Reconnects

Socket: `wait_for_game` (backend/src/sockets/chessGameRoomSocket.ts)

- If a game exists, server emits `game_room_ready` to the reconnecting player.
- The client does not request clock state; the server pushes `clock_update` only when the clock changes (start, switch, pause, reset).

### Rematch

Socket: `offer_rematch` (backend/src/sockets/chessGameRoomSocket.ts)

```typescript
gameRoomService.startNewGameInRoom(roomId);
gameRoomService.swapPlayerColors(roomId);
chessGameService.createChessGameForRoom(roomId);
chessClockService.resetClock(roomId);
io.to(gameRoomTarget).emit('game_room_ready');
```

Resets both clocks to initial time and paused state, and signals the room is ready.

### Room Cleanup

**Socket Handler**: `disconnect` (backend/src/sockets/chessGameRoomSocket.ts)

```typescript
// When all players disconnect
chessClockService.deleteClockForRoom(roomId);
gameRoomService.deleteGameRoom(roomId);
```

Removes clock state from memory when the room is deleted.

## Time Expiration

Timeouts are resolved via `computeGameStateBasedOnClock(clockState, board)` from `@grouchess/chess` and handled in the `move_piece` socket. If it returns a terminal state, the server:

- Pauses the clock
- Ends the game in the room
- Emits `game_ended` with `reason` set to the returned status (`'time-out'` or `'insufficient-material'`) and the `winner` when applicable
- Emits a final `clock_update`

## Pause/Resume

The service supports pausing and resuming clocks and is used by the socket handlers:

```typescript
chessClockService.pauseClock(roomId); // save time, stop clock
chessClockService.startClock(roomId, activeColor); // resume and set active side
```

Use cases:

- Pause at game end
- Optional pause on disconnects (not enabled)
- Maintenance windows

Current behavior: clocks continue running during disconnections (standard for online chess).

## Socket Events

### Server -> Client

- `clock_update` - Broadcast after start/switch/pause/reset and on game end
- `game_ended` - Unified game conclusion event (includes timeouts)

### Client -> Server

- No dedicated request for clock state. The server is authoritative and pushes updates.

## Frontend Integration

- Initial/current clock state via HTTP
    - File: `frontend/src/components/views/ViewController.tsx`
    - Flow: listens for `game_room_ready` → fetches chess game data (HTTP) → receives `clockState` → rebases server `lastUpdatedTimeMs` to a performance baseline with `rebaseServerClockToPerf` (`frontend/src/utils/clock.ts`) → passes into provider as `initialChessGameRoomData`.

- State holder
    - File: `frontend/src/providers/ChessGameRoomProvider.tsx`
    - Exposes `clockState`, `setClocks`, and `resetClocks` via context for controllers and UI.

- Controllers (who drive the clocks)
    - Self‑play: `frontend/src/components/controllers/ChessClocksLocalController.tsx`
        - Mirrors server semantics locally using `updateClockState` and starts/stops via provider.
        - Uses `useTimeoutDetection` to end games on local timeout.
    - Multiplayer: `frontend/src/components/controllers/ChessClocksSocketController.tsx`
        - Subscribes to `clock_update` socket events and applies `rebaseServerClockToPerf` before `setClocks`.
        - Drives the shared tick only when an active, unpaused clock is present.

- Monotonic ticking
    - File: `frontend/src/providers/ClockTickProvider.tsx`
    - Provides `nowMs` from `performance.now()` using `requestAnimationFrame` for smooth countdowns across the app.

- Local timeout detection
    - File: `frontend/src/hooks/useTimeoutDetection.ts`
    - Computes updated time locally (`updateClockState`) and checks for expiration (`computeGameStateBasedOnClock`). On timeout, pauses clocks and dispatches `endGame`. Server remains authoritative in multiplayer and also emits `game_ended`.

- Rendering
    - File: `frontend/src/components/ChessClock.tsx`
    - Pure display component that derives visible time from `clockState` and `nowMs`, showing milliseconds below a threshold.

## Data Flow

### Multiplayer: Initial Load and Updates

```
Server (socket) ── game_room_ready ─▶ Client (ViewController)
Client (HTTP)  ── GET /game        ─▶ Server
Server         ── JSON {chessGame, clockState} ─▶ Client
Client         ── rebase lastUpdatedTimeMs to perf baseline
Client         ── provide initial state via ChessGameRoomProvider
Client         ── attach ChessClocksSocketController
Server (socket) ── clock_update on start/switch/pause/reset ─▶ Client
Server (socket) ── game_ended on checkmate/draw/time‑out     ─▶ Client
```

- Client never requests clock via socket; server pushes via `clock_update`.
- On timeout, server emits `game_ended` then a final `clock_update` (paused).
- UI uses `ClockTickProvider` for smooth countdown; timestamps are monotonic (`performance.now()`).

### Self‑Play: Local Control

```
Client (menu) ── start self play ─▶ create initial clocks
Client         ── ChessClocksLocalController drives start/switch locally
Client         ── ClockTickProvider provides nowMs; UI renders
Client         ── useTimeoutDetection ends game on local time‑out
```

- Mirrors backend semantics with `updateClockState` and increment on switch.
- No server involvement; no socket updates needed.

### Reconnect

```
Server (socket) ── game_room_ready ─▶ Rejoining client
Client (HTTP)  ── GET /game        ─▶ Server
Server         ── JSON {chessGame, clockState} ─▶ Client
Client         ── rebase + attach controllers → receives subsequent clock_update
```

### Move Processing (Server Authority)

```
Client ── move_piece ─▶ Server
Server: if computeGameStateBasedOnClock says time‑out → pause clock, end game, emit game_ended + clock_update
Else: apply move → start/switch clock → emit clock_update
```

## Key Design Decisions

1. **Server-authoritative**: Server is the source of truth for time
2. **No timers**: Calculate on-demand instead of using intervals
3. **Separate service**: Clock logic isolated from chess game logic
4. **Room-scoped**: Each game room has its own clock instance
5. **In-memory only**: No database persistence (acceptable for real-time games)

## Future Enhancements

- Server-side timers for proactive timeout handling
