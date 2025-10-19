# Grouchess

Grouchess is a Lichess-clone project just for fun and learning. A chess game built with Vite + React + TypeScript.
The goal is to replicate core Lichess gameplay UX and then explore a realtime backend with Express + Socket.io to play
with other players.

Status: UI-only. There is no backend yet; all gameplay runs client-side.
The move engine supports standard moves, castling, pawn promotions, and en passant. See [Roadmap](#roadmap).

## Tech Stack

- Frontend: React 19, Vite, TypeScript, Tailwind CSS 4
- Planned backend: Express + Socket.io (placeholder workspace exists but no code yet)
- Tooling: ESLint, Prettier, TypeScript project refs, workspaces

## Quick Start

Requirements: Node 18+ (Node 20+ recommended)

Install dependencies (from repo root):

```bash
pnpm install
```

Run the frontend dev server:

```bash
pnpm dev:frontend
```

Notes

- `pnpm dev` tries to run both backend and frontend; the backend workspace is empty, so prefer `dev:frontend` for now.
- Type checking and linting:
    - `pnpm typecheck`
    - `pnpm lint`

## File Structure

```
.
├─ frontend/                                                  # Vite React app
│  ├─ public/                                                 # Static assets (piece SVGs)
│  └─ src/
│     ├─ components/                                          # UI components
│     │  ├─ ChessBoard.tsx                                    # Board UI, drag/click interaction, glow rendering
│     │  ├─ ChessSquare.tsx                                   # Single square visuals
│     │  ├─ ChessPiece.tsx                                    # Piece rendering (image/text fallback)
│     │  ├─ GhostPiece.tsx                                    # Drag ghost overlay
│     │  ├─ PawnPromotionPrompt.tsx                           # Modal with pawn promotion options
│     │  ├─ PromotionCard.tsx                                 # Pawn promotion modal content
│     │  ├─ SoundEffects.tsx                                  # Sound effects component that subscribes to game state
│     │  ├─ SoundControls.tsx                                 # Mute/volume UI controls
│     │  ├─ GameInfoPanel.tsx                                 # Side panel with move history and game actions
│     │  ├─ InfoCard.tsx, PlayerCard.tsx, ResetButton.tsx     # Non-chessboard components
│     ├─ providers/                                           # React context providers
│     │  ├─ ChessGameProvider.tsx                             # Game state/reducer and context API
│     │  ├─ SoundProvider.tsx                                 # Sound effects context API
│     │  └─ ImagesProvider.tsx                                # Preload/decode piece images
│     └─ utils/                                               # Core chess logic + helpers
│        ├─ board.ts                                          # Board coords, bounds, king lookups, glow helpers
│        ├─ pieces.ts                                         # Piece metadata, colors, constants
│        ├─ moves.ts                                          # Move engine (Move type, gen, legality, en passant, castling)
│        ├─ notations.ts                                      # algebraic notation generation/parsing
│        └─ preload.ts                                        # Image preloading utilities
├─ backend/                                                   # Placeholder workspace (Express + Socket.io planned)
└─ package.json                                               # Workspace scripts
```

## Core Components & Logic

- Game state: `frontend/src/providers/ChessGameProvider.tsx`
    - Holds:
        - `board`
        - `playerTurn`
        - `castleRightsByColor`
        - `enPassantTargetIndex`
        - `halfmoveClock`
        - `fullmoveClock`
        - `moveHistory`
        - `previousMoveIndices`
        - `timelineVersion`
        - `pendingPromotion`
        - `gameStatus`
        - `legalMovesStore`
    - Reducer applies a Move to produce the next board and updates castling rights & clocks.
    - Generates legal moves each turn and caches them in `legalMovesStore`.
    - Able to initialize from FEN strings.

- Move engine: `frontend/src/utils/moves.ts`
    - `type Move` models a move (start/end/type, moving piece, optional capture info).
    - `computePossibleMovesForIndex(...)` generates legal moves for a square and filters out self-check.
    - `isSquareAttacked(...)` detects attacks via pre-hoisted attacker sets.
    - `computeNextChessBoardFromMove(board, move)` returns a chess board with a given move applied to it
      (castling/en passant included).
    - `computeCastleRightsChangesFromMove(move)` produces castling rights diffs.

- Board UI: `frontend/src/components/ChessBoard.tsx`
    - Pointer drag-and-drop and click-to-move.
    - Builds an `endIndex -> Move` map for the selected piece and glows squares accordingly.

- Visuals: `frontend/src/components/ChessSquare.tsx`
    - Renders per-square state (selected, previous move, check, canMove/canCapture).
    - Renders coordinate legends (files a–h and ranks 1–8)

- Piece set images & preload: `frontend/src/providers/ImagesProvider.tsx`, `frontend/src/utils/preload.ts`
    - Preloads and decodes SVGs to avoid flicker; falls back to text if an image fails.

- Sounds:
    - `frontend/src/providers/SoundProvider.tsx` manages sound state and HTMLAudioElement pooling.
    - `frontend/src/components/SoundEffects.tsx` subscribes to game state changes and plays sounds.
    - `frontend/src/components/SoundControls.tsx` has sound settings UI (mute/volume).

## Roadmap

- Draw and ~~checkmate~~ detection (~~stalemate~~, ~~checkmate~~, ~~50-move~~, threefold, insufficient material)
- Move undos
- Game timers
- Resign/draw offers
- Change piece set images
- Change board colors
- Piece sliding animations
- Backend service with Express + Socket.io for realtime play with other players
- Main menu to start a new game or join a game

## Credits

- Piece SVGs from [Lichess](https://github.com/lichess-org/lila/tree/master/public/piece)
- Sound effects from [Lichess](https://github.com/lichess-org/lila/tree/master/public/sound/lisp)
- Icons from [FontAwesome](https://fontawesome.com)
