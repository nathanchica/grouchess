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
    lastUpdatedTime: Date | null;
    baseTimeMs: number; // Initial time for resets
    incrementMs: number; // Fischer increment per move
    isPaused: boolean;
};
```

## How It Works

### 1. On-Demand Time Calculation (No Intervals)

Instead of using timers that decrement every second, the service calculates elapsed time only when needed:

- When the clock switches after a move
- When state is requested (e.g., player reconnects)
- When checking for time expiration

**Formula**: `newTime = currentTime - elapsedMs + incrementMs`

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

**Socket Handler**: `join_game_room` (gameRoomSocket.ts:77-86)

```typescript
// When second player joins
const clockState = chessClockService.initializeClockForRoom(roomId, timeControl);
sendLoadGameEvent(io, `room:${roomId}`, gameRoom, fen, clockState);
```

Clock is initialized in **paused** state with:

- Both players have full time
- No clock is active
- `lastUpdatedTime` is null

### First Move (Clock Start)

The clock remains paused until the first move is made. When white makes the first move, black's clock becomes active.

### Each Move (Clock Switch)

**Socket Handler**: `move_piece` (gameRoomSocket.ts:122-135)

```typescript
// After validating and applying the move
chessClockService.switchClock(roomId, nextPlayerColor);
io.to(`room:${roomId}`).emit('clock_updated', { clockState });
```

The `switchClock` method:

1. Calculates elapsed time for the active clock
2. Deducts elapsed time from active player's remaining time
3. Adds increment to active player's time
4. Switches which clock is active
5. Updates `lastUpdatedTime` to now

### Player Reconnects

**Socket Handler**: `join_game_room` (gameRoomSocket.ts:63-71)

```typescript
// If game is already in progress
const clockState = chessClockService.getClockStateForRoom(roomId);
sendLoadGameEvent(io, `player:${playerId}`, gameRoom, fen, clockState);
```

The service calculates current time before sending, ensuring the reconnecting player gets accurate state.

### Rematch

**Socket Handler**: `offer_rematch` (gameRoomSocket.ts:186-190)

```typescript
// After both players accept rematch
const clockState = chessClockService.resetClock(roomId);
sendLoadGameEvent(io, `room:${roomId}`, gameRoom, fen, clockState);
```

Resets both clocks to initial time and paused state.

### Room Cleanup

**Socket Handler**: `disconnect` (gameRoomSocket.ts:208-223)

```typescript
// When all players disconnect
chessClockService.deleteClockForRoom(roomId);
gameRoomService.deleteGameRoom(roomId);
```

Removes clock state from memory when the room is deleted.

## Time Expiration

The service provides `checkTimeExpired()` to detect when a player runs out of time:

```typescript
const expiredColor = chessClockService.checkTimeExpired(roomId);
if (expiredColor) {
    // Handle game over - player with expiredColor loses
}
```

**Note**: Time expiration handling is not yet implemented in the socket handlers but the service method is ready.

## Pause/Resume (Future)

The service supports pausing and resuming clocks:

```typescript
chessClockService.pauseClock(roomId); // Save time, stop clock
chessClockService.startClock(roomId); // Resume from saved time
```

**Use cases**:

- Pause when a player disconnects (optional, more forgiving)
- Pause for system maintenance
- Resume when player reconnects

**Current behavior**: Clocks continue running during disconnections (standard for online chess).

## Socket Events

### Server -> Client

- `clock_updated` - Sent after each move with updated clock state
- (Future) `time_expired` - Sent when a player runs out of time

### Client -> Server

- (Future) `request_clock_state` - Client requests current clock state for sync

## Key Design Decisions

1. **Server-authoritative**: Server is the source of truth for time
2. **No timers**: Calculate on-demand instead of using intervals
3. **Separate service**: Clock logic isolated from chess game logic
4. **Room-scoped**: Each game room has its own clock instance
5. **In-memory only**: No database persistence (acceptable for real-time games)

## Future Enhancements

- [ ] Implement time expiration handling in socket handlers
- [ ] Add `time_expired` event emission
- [ ] Add pause/resume on disconnect (configurable)
- [ ] Support for delay/Bronstein time control variants
- [ ] Low time warnings (e.g., when < 10 seconds remain)
