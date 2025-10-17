# Grouchess

Grouchess is a Lichess-clone project just for fun and learning. A chess game built with Vite + React + TypeScript.
The goal is to replicate core Lichess gameplay UX and then explore a realtime backend with Express + Socket.io to play
with other players.

Status: UI-only. There is no backend yet; all gameplay runs client-side.
The move engine supports standard moves, castling, pawn promotions, and en passant. Checkmate/draw detection is not
implemented yet. See [Roadmap](#roadmap).

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
│     │  ├─ InfoCard.tsx, PlayerCard.tsx, ResetButton.tsx     # Non-chessboard components
│     ├─ providers/                                           # React context providers
│     │  ├─ ChessGameProvider.tsx                             # Game state/reducer and context API
│     │  └─ ImagesProvider.tsx                                # Preload/decode piece images
│     └─ utils/                                               # Core chess logic + helpers
│        ├─ board.ts                                          # Board coords, bounds, king lookups, glow helpers
│        ├─ pieces.ts                                         # Piece metadata, colors, constants
│        ├─ moves.ts                                          # Move engine (Move type, gen, legality, en passant, castling)
│        └─ preload.ts                                        # Image preloading utilities
├─ backend/                                                   # Placeholder workspace (Express + Socket.io planned)
└─ package.json                                               # Workspace scripts
```

## Core Components & Logic

- Game state: `frontend/src/providers/ChessGameProvider.tsx`
    - Holds `board`, `castleRightsByColor`, `playerTurn`, `moveHistory`, `previousMoveIndices`.
    - Reducer applies a Move to produce the next board and updates castling rights.

- Move engine: `frontend/src/utils/moves.ts`
    - `type Move` models a move (start/end/type, moving piece, optional capture info).
    - `computePossibleMovesForIndex(...)` generates legal moves for a square and filters out self-check.
    - `isSquareAttacked(...)` detects attacks via pre-hoisted attacker sets.
    - `computeEnPassantTarget(...)` derives en passant target from the previous move.
    - `computeNextChessBoardFromMove(board, move)` returns a chess board with a given move applied to it
      (castling/en passant included).
    - `computeCastleRightsChangesFromMove(move)` produces castling rights diffs.

- Board UI: `frontend/src/components/ChessBoard.tsx`
    - Pointer drag-and-drop and click-to-move.
    - Builds an `endIndex -> Move` map for the selected piece and glows squares accordingly.

- Visuals: `frontend/src/components/ChessSquare.tsx`
    - Renders per-square state (selected, previous move, check, canMove/canCapture).

- Assets & preload: `frontend/src/providers/ImagesProvider.tsx`, `frontend/src/utils/preload.ts`
    - Preloads and decodes SVGs to avoid flicker; falls back to text if an image fails.

## Roadmap

- Draw and checkmate detection (stalemate, checkmate, 50-move, threefold, insufficient material)
- Move history display
- Move undos
- Game timers
- Sounds
- Piece sliding animations
- Resign/draw offers
- Backend service with Express + Socket.io for realtime play
- Main menu to start a new game or join a game
