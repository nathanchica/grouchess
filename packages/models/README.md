# @grouchess/models

> **This documentation is automatically generated. Do not edit manually.**

Zod schemas and TypeScript types for shared data models in the Grouchess chess application.

## Installation

```bash
pnpm add @grouchess/models
```

## Available Schemas

### Board

Located in: `src/board.ts`

- **BoardIndexSchema**
- **RowColSchema**

### Chess

Located in: `src/chess.ts`

- **CastleRightsByColorSchema**
- **CastleRightsSchema**
- **CastleSideEnum**
    - `"short"`
    - `"long"`
- **ChessBoardSchema**
- **ChessBoardStateSchema**
- **ChessGameSchema**
- **ChessGameStateSchema**
- **ChessGameStatusEnum**
    - `"in-progress"`
    - `"checkmate"`
    - `"stalemate"`
    - `"50-move-draw"`
    - `"threefold-repetition"`
    - `"insufficient-material"`
    - `"draw-by-agreement"`
    - `"resigned"`
    - `"time-out"`
- **EndGameReasonEnum**
    - `"draw-by-agreement"`
    - `"resigned"`
    - `"time-out"`
    - `"insufficient-material"`
- **ExpiredClockGameStatusEnum**
    - `"time-out"`
    - `"insufficient-material"`
- **LegalMovesStoreSchema**
- **MoveNotationSchema**
- **MoveRecordSchema**
- **MoveSchema**
- **MoveTypeEnum**
    - `"standard"`
    - `"capture"`
    - `"short-castle"`
    - `"long-castle"`
    - `"en-passant"`
- **PawnPromotionEnum**
    - `"r"`
    - `"n"`
    - `"b"`
    - `"q"`
    - `"R"`
    - `"N"`
    - `"B"`
    - `"Q"`
- **PieceAliasEnum**
    - `"p"`
    - `"r"`
    - `"n"`
    - `"b"`
    - `"q"`
    - `"k"`
    - `"P"`
    - `"R"`
    - `"N"`
    - `"B"`
    - `"Q"`
    - `"K"`
- **PieceCaptureSchema**
- **PieceColorEnum**
    - `"white"`
    - `"black"`
- **PieceSchema**
- **PieceTypeEnum**
    - `"pawn"`
    - `"rook"`
    - `"knight"`
    - `"bishop"`
    - `"queen"`
    - `"king"`
- **PositionCountsSchema**

### Clocks

Located in: `src/clocks.ts`

- **ChessClockStateSchema**

### GameRoom

Located in: `src/gameRoom.ts`

- **ChessGameRoomSchema**
- **GameRoomSchema**
- **RoomTypeEnum**
    - `"self"`
    - `"player-vs-cpu"`
    - `"player-vs-player"`
- **TimeControlSchema**
- **WaitingRoomSchema**

### Messages

Located in: `src/messages.ts`

- **ChessGameMessageSchema**
- **ChessGameMessageTypeEnum**
    - `"standard"`
    - `"rematch-offer"`
    - `"player-left-room"`
    - `"player-rejoined-room"`
    - `"rematch-accept"`
    - `"rematch-decline"`
    - `"draw-offer"`
    - `"draw-decline"`
    - `"draw-accept"`
- **ChessGameOfferMessageEnum**
    - `"draw-offer"`
    - `"rematch-offer"`
- **ChessGameOfferResponseMessageEnum**
    - `"draw-decline"`
    - `"draw-accept"`
    - `"rematch-decline"`
    - `"rematch-accept"`
- **MessageSchema**
- **MessageTypeEnum**
    - `"standard"`
    - `"rematch-offer"`
    - `"player-left-room"`
    - `"player-rejoined-room"`
    - `"rematch-accept"`
    - `"rematch-decline"`

### Players

Located in: `src/players.ts`

- **PlayerSchema**
- **PlayerStatusEnum**
    - `"online"`
    - `"offline"`
    - `"away"`

## Development

### Building

```bash
pnpm build
```

### Generating Documentation

```bash
pnpm docs:generate
```

This command automatically updates this README with the list of all available schemas.

**Note:** Documentation is automatically regenerated when schema files are modified and committed (via lint-staged).
