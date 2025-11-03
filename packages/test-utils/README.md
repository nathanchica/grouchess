# @grouchess/test-utils

Mock data factories for unit tests across the Grouchess monorepo.

## Installation

```bash
pnpm add -D @grouchess/test-utils
```

## Usage

### Game Room Mock Factories

```typescript
import {
    createMockPlayer,
    createMockMessage,
    createMockTimeControl,
    createMockGameRoom,
    createMockChessGameRoom,
} from '@grouchess/test-utils';

// Create default player
const player = createMockPlayer();

// Create player with custom name
const alice = createMockPlayer({
    id: 'player-123',
    displayName: 'Alice',
});

// Create player with custom status
const awayPlayer = createMockPlayer({
    displayName: 'Bob',
    status: 'away',
});

// Create default message
const message = createMockMessage();

// Create message with custom content
const chatMessage = createMockMessage({
    authorId: 'player-123',
    content: 'Good game!',
});

// Create draw offer message
const drawOffer = createMockMessage({
    type: 'draw-offer',
    content: undefined,
});

// Create system message
const systemMessage = createMockMessage({
    type: 'player-left-room',
    content: 'Alice has left the room',
});

// Create default time control (3|2 blitz)
const timeControl = createMockTimeControl();

// Create rapid time control (10|0)
const rapidControl = createMockTimeControl({
    alias: '10|0',
    minutes: 10,
    increment: 0,
    displayText: '10 min',
});

// Create default game room
const room = createMockGameRoom();

// Create game room with players
const pvpRoom = createMockGameRoom({
    type: 'player-vs-player',
    players: [createMockPlayer({ id: 'p1', displayName: 'Alice' }), createMockPlayer({ id: 'p2', displayName: 'Bob' })],
    playerIdToDisplayName: { p1: 'Alice', p2: 'Bob' },
});

// Create default chess game room
const chessRoom = createMockChessGameRoom();

// Create chess game room with time control and color assignments
const setupChessRoom = createMockChessGameRoom({
    timeControl: createMockTimeControl({ alias: '10|0', minutes: 10, increment: 0 }),
    players: [createMockPlayer({ id: 'p1', displayName: 'Alice' }), createMockPlayer({ id: 'p2', displayName: 'Bob' })],
    colorToPlayerId: {
        white: 'p1',
        black: 'p2',
    },
});
```

### Chess Clocks Mock Factories

```typescript
import { createMockChessClockState } from '@grouchess/test-utils';

// Create default clock state (10 minutes + 0 increment)
const clock = createMockChessClockState();

// Create blitz time control (3 minutes + 2 seconds)
const blitzClock = createMockChessClockState({
    baseTimeMs: 180000,
    incrementMs: 2000,
});

// Create mid-game state with white's turn active
const activeGame = createMockChessClockState({
    white: {
        timeRemainingMs: 450000,
        isActive: true,
    },
    black: {
        timeRemainingMs: 380000,
        isActive: false,
    },
    lastUpdatedTimeMs: Date.now(),
});
```

### Chess Mock Factories

The package provides mock factory functions for all chess-related types:

```typescript
import {
    createMockChessGame,
    createMockChessBoardState,
    createMockMove,
    createMockPiece,
    // ... and many more
} from '@grouchess/test-utils';

// Create a mock chess game with default values
const game = createMockChessGame();

// Create a mock chess game with overrides
const customGame = createMockChessGame({
    boardState: createMockChessBoardState({
        playerTurn: 'black',
        halfmoveClock: 5,
    }),
    gameState: {
        status: 'checkmate',
        winner: 'white',
    },
});

// Create a starting position game
const startingGame = createMockStartingChessGame();

// Create a custom board layout
const customBoard = createMockChessBoard({
    0: 'R', // White rook at a1
    7: 'K', // White king at h1
    56: 'r', // Black rook at a8
    63: 'k', // Black king at h8
});

// Create a custom piece
const queen = createMockPiece({
    alias: 'Q',
    color: 'white',
    type: 'queen',
    value: 9,
});

// Create a custom move
const move = createMockMove({
    startIndex: 52, // e2
    endIndex: 36, // e4
    type: 'standard',
    piece: createMockPiece(),
});
```

## Available Factories

### Game Room

- `createMockPlayer(overrides?: Partial<Player>): Player`
- `createMockMessage(overrides?: Partial<Message>): Message`
- `createMockTimeControl(overrides?: Partial<TimeControl>): TimeControl`
- `createMockGameRoom(overrides?: Partial<GameRoom>): GameRoom`
- `createMockChessGameRoom(overrides?: Partial<ChessGameRoom>): ChessGameRoom`

### Chess Clocks

- `createMockChessClockState(overrides?: Partial<ChessClockState>): ChessClockState`

### Basic Types

- `createMockBoardIndex(value?: number): BoardIndex`
- `createMockRowCol(overrides?: Partial<RowCol>): RowCol`

### Pieces

- `createMockPiece(overrides?: Partial<Piece>): Piece`

### Castle Rights

- `createMockCastleRights(overrides?: Partial<CastleRights>): CastleRights`
- `createMockCastleRightsByColor(overrides?: Partial<CastleRightsByColor>): CastleRightsByColor`

### Board

- `createMockChessBoard(overrides?: Record<number, PieceAlias>): ChessBoardType`
- `createMockStartingChessBoard(): ChessBoardType`

### Board State

- `createMockChessBoardState(overrides?: Partial<ChessBoardState>): ChessBoardState`
- `createMockStartingChessBoardState(overrides?: Partial<ChessBoardState>): ChessBoardState`

### Moves

- `createMockMove(overrides?: Partial<Move>): Move`
- `createMockMoveNotation(overrides?: Partial<MoveNotation>): MoveNotation`
- `createMockMoveRecord(overrides?: Partial<MoveRecord>): MoveRecord`

### Game State

- `createMockLegalMovesStore(overrides?: Partial<LegalMovesStore>): LegalMovesStore`
- `createMockChessGameState(overrides?: Partial<ChessGameState>): ChessGameState`
- `createMockPieceCapture(overrides?: Partial<PieceCapture>): PieceCapture`
- `createMockPositionCounts(overrides?: PositionCounts): PositionCounts`

### Full Game

- `createMockChessGame(overrides?: Partial<ChessGame>): ChessGame`
- `createMockStartingChessGame(overrides?: Partial<ChessGame>): ChessGame`

## Development

```bash
# Build the package
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck
```
