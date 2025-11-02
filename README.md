# Grouchess

Grouchess is a Lichess-clone project just for fun and learning.

Status: Core functionalities implemented. See [Roadmap](#roadmap) for planned features.

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4, Socket.io-client
- Backend: Express, Socket.io, Zod
- Tooling: ESLint, Prettier, pnpm, Husky

## Features

- Player vs Player over network (via Socket.io)
    - Chat
    - Rematches
    - Draw offers
- Player vs Self (local)
- Drag-and-drop and click-to-move piece movement
- Legal move generation and enforcement
    - Castling, en passant, pawn promotion
- Game status detection (check, checkmate, stalemate, draws)
    - Threefold repetition detection
    - 50-move rule
    - Insufficient material
- Move history display
    - Algebraic notation (SAN) and FEN generation/parsing
- Game clocks
    - Monotonic timers in frontend
- Sharing FEN strings of current board state
- Loading board from FEN strings (self-play mode only)
- Sound effects with mute/volume controls
- Preloaded and cached piece set images with text fallback
- Game rooms with unique IDs
- Responsive design for desktop and mobile
- Auth tokens for player identity in game rooms
    - Persists across page reloads (saved in sessionStorage)
- Main menu with room creation
- Waiting room UI for challengers
- Health check view while waiting for backend to wake back up
- Error boundary with Sentry logging
- GitHub Action for linting, type checking, and running unit tests on PRs

## Quick Start

Requirements: Node 18+ (Node 20+ recommended)

Install dependencies (from repo root):

```bash
pnpm install
```

Run both dev servers:

```bash
pnpm dev
```

## File Structure

```
.
├─ backend/                                   # Express + Socket.IO API/server
│  └─ src/
│     ├─ index.ts                             # Server entry
│     ├─ app.ts                               # Express app wiring
│     ├─ config.ts                            # Env/config utilities
│     ├─ routes/                              # REST endpoints
│     │  ├─ health.ts
│     │  ├─ room.ts
│     │  └─ timeControl.ts
│     ├─ sockets/                             # Socket.IO namespaces/handlers
│     │  └─ chess_game_room/
│     │     ├─ handlers/
│     │     │  ├─ chat.ts                     # Chat event handlers
│     │     │  ├─ moves.ts                    # Move event handlers
│     │     │  ├─ lifecycle.ts                # Game lifecycle event handlers
│     │     │  ├─ disconnect.ts               # Disconnect handler
│     │     │  └─ offers.ts                   # Draw/resign/rematch offer handlers
│     │     ├─ index.ts                       # Socket namespace bootstrap
│     │     ├─ context.ts                     # Socket event handler context
│     │     ├─ utils.ts                       # Event handler utils
│     │     └─ types.ts                       # Shared types for handlers
│     ├─ servers/
│     │  └─ chess.ts                          # Socket server bootstrap
│     ├─ services/                            # Domain services (chess/game room/clock)
│     │  ├─ chessClockService.ts
│     │  ├─ chessGameService.ts
│     │  ├─ gameRoomService.ts
│     │  └─ playerService.ts
│     ├─ middleware/
│     │  ├─ authenticateRequest.ts
│     │  └─ authenticateSocket.ts
│     └─ utils/
│        ├─ errors.ts
│        ├─ generateId.ts
│        └─ token.ts
│
├─ frontend/                                  # Vite + React client
│  ├─ public/                                 # Static assets (SVG pieces, sounds)
│  └─ src/
│     ├─ components/
│     │  ├─ chess_board/                      # Board UI, pieces, promotion
│     │  ├─ common/                           # Generic UI (buttons, tooltips, etc.)
│     │  ├─ controllers/                      # Orchestrators (moves, sound)
│     │  ├─ game_info_panel/                  # Move history, modals, result card
│     │  ├─ mainmenu/                         # Room creation/joining UI
│     │  └─ views/                            # Top-level views
│     ├─ providers/                           # React context providers
│     │  ├─ AuthProvider.tsx
│     │  ├─ SocketProvider.tsx
│     │  ├─ ChessGameRoomProvider.tsx
│     │  ├─ ClockTickProvider.tsx
│     │  ├─ PlayerChatSocketProvider.tsx
│     │  ├─ SoundProvider.tsx
│     │  └─ ImagesProvider.tsx
│     ├─ hooks/                               # Custom hooks for data fetching, room/join, clocks, etc.
│     ├─ utils/                               # UI utilities (preload, types, pieces, draws)
│     ├─ socket.ts                            # Socket.IO client bootstrap
│     ├─ App.tsx
│     └─ main.tsx
│
├─ packages/                                  # Shared TS libraries for FE/BE
│  ├─ chess/                                  # Core chess engine + schemas
│  │  └─ src/
│  │     ├─ board.ts
│  │     ├─ castles.ts
│  │     ├─ draws.ts
│  │     ├─ moves.ts
│  │     ├─ notations.ts
│  │     ├─ pieces.ts
│  │     ├─ schema.ts
│  │     └─ state.ts
│  ├─ game-room/                              # Game room models, time control, scores
│  │  └─ src/
│  │     ├─ schema.ts
│  │     ├─ timeControl.ts
│  │     └─ scores.ts
│  ├─ http-schemas/                           # Zod schemas for HTTP contracts
│  │  └─ src/
│  │     ├─ chess.ts
│  │     └─ timeControl.ts
│  ├─ socket-events/                          # Socket.IO event names/payload types
│  │  └─ src/
│  │     ├─ common.ts
│  │     └─ chess.ts
│  └─ errors/                                 # Shared error helpers/types
│     └─ src/
│        └─ index.ts
│
├─ docs/                                      # Project docs
│  └─ ChessGameClock.md
├─ scripts/                                   # Dev scripts
├─ package.json                               # Root workspace scripts/config
├─ pnpm-workspace.yaml                        # Monorepo workspace config
└─ tsconfig.json                              # Base TS config
```

## Core Components & Logic

- Chess engine (shared): `packages/chess`
    - State and legal moves: `packages/chess/src/state.ts`, `packages/chess/src/moves.ts`
        - `computeAllLegalMoves`, `computeNextChessGameAfterMove`, `isKingInCheck`
    - Notation/FEN: `packages/chess/src/notations.ts`
        - `createFEN`, `isValidFEN`
    - Draws and castling: `packages/chess/src/draws.ts`, `packages/chess/src/castles.ts`
        - `isDrawStatus`, `computeCastleRightsChangesFromMove`
    - Types/schemas: `packages/chess/src/schema.ts` (Zod + TypeScript types)

- Game room & time controls (shared): `packages/game-room`
    - Models: `packages/game-room/src/schema.ts` (players, messages, room types)
    - Time control helpers: `packages/game-room/src/timeControl.ts`
        - `SUPPORTED_TIME_CONTROLS`, `getTimeControlByAlias`, `isValidTimeControlAlias`
    - Scoring: `packages/game-room/src/scores.ts` (`computePlayerScores`)

- Socket events (shared): `packages/socket-events`
    - Event contracts and payload schemas: `packages/socket-events/src/chess.ts`, `packages/socket-events/src/common.ts`
    - Used by backend `backend/src/sockets/chess_game_room/*` and frontend providers
      (`frontend/src/providers/ChessClockSocketProvider.tsx`, `frontend/src/providers/PlayerChatSocketProvider.tsx`,
      `frontend/src/providers/SocketProvider.tsx`).

- HTTP contracts (shared): `packages/http-schemas`
    - REST request/response schemas for chess/game-room: `packages/http-schemas/src/chess.ts`, `packages/http-schemas/src/timeControl.ts`
    - Used in backend routes (`backend/src/routes/*`) and frontend hooks
      (`frontend/src/hooks/useFetchChessGame.ts`, `frontend/src/hooks/useFetchTimeControlOptions.ts`,
      `frontend/src/hooks/useCreateGameRoom.ts`, `frontend/src/hooks/useJoinGameRoom.ts`).

- Backend services: `backend/src/services/*`
    - `chessGameService.ts` (game lifecycle, move application)
    - `chessClockService.ts` (room clock state, emits `clock_update`)
    - `gameRoomService.ts` (room creation/join/updates), `playerService.ts`
    - Auth: `backend/src/utils/token.ts`, middleware (`authenticateRequest.ts`, `authenticateSocket.ts`)

- Frontend orchestration
    - Providers: `AuthProvider.tsx`, `SocketProvider.tsx`, `ChessGameRoomProvider.tsx`,
      `ChessClockSocketProvider.tsx`, `PlayerChatSocketProvider.tsx`, `SoundProvider.tsx`, `ImagesProvider.tsx`
    - Controllers: `frontend/src/components/controllers/ChessMovesController.tsx`, `.../SoundEffects.tsx`
    - Hooks: `useMonotonicClock.ts`, `useCreateGameRoom.ts`, `useJoinGameRoom.ts`,
      `useFetchChessGame.ts`, `useFetchTimeControlOptions.ts`, `useWaitingRoom.ts`
    - UI: `frontend/src/components/chess_board/*`, `.../game_info_panel/*`, `.../chat/*`, `.../common/*`, `.../views/*`

- Clocks
    - See `docs/ChessGameClock.md` for detailed design and implementation notes.

## Roadmap

- Player vs CPU mode
    - AI chat
- Game history export and import (PGN)
- Terminal / CLI client
- Chat panel
    - Move takebacks
    - Slash commands (e.g., /rematch, /resign)
    - Typing indicators
    - Grouped messages by time
    - Message reactions
- Timeline jumping
- Server-side timeout enforcement
- Change piece set images
- Change board colors
- Piece sliding animations

- More game modes:
    - Othello/Reversi
    - Battleship

#### Won't implement

- Correspondence chess (days per move)
- Puzzles / tactics trainer / analysis board
- Variants (Chess960, King of the Hill, Three-check, etc.)
- User accounts / profiles / ratings
- Custom time controls
    - Separate time controls per player
- Game room long persistence (game rooms are deleted when all players leave)
- Spectators

## Credits

- Piece SVGs from [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece)
- Sound effects from [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/lisp)
- Icons from [FontAwesome](https://fontawesome.com)
- Animated cat pixel art by [MPGames](https://mariaparragames.itch.io/fat-cat-set)
- Tower fall icon by [Lorc from game-icons.net](https://game-icons.net/1x1/lorc/tower-fall.html)
