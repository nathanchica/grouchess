import * as z from 'zod';

export const NUM_SQUARES = 64;
export const NUM_COLS = 8;
export const NUM_ROWS = 8;

export const BoardIndexSchema = z
    .number()
    .int()
    .min(0)
    .max(NUM_SQUARES - 1);
export type BoardIndex = z.infer<typeof BoardIndexSchema>;

export const RowColSchema = z.object({
    row: z
        .number()
        .int()
        .min(0)
        .max(NUM_ROWS - 1),
    col: z
        .number()
        .int()
        .min(0)
        .max(NUM_COLS - 1),
});
export type RowCol = z.infer<typeof RowColSchema>;

export const CastleSideEnum = z.enum(['short', 'long']);
export const PieceAliasEnum = z.enum(['p', 'r', 'n', 'b', 'q', 'k', 'P', 'R', 'N', 'B', 'Q', 'K']);
export const PieceColorEnum = z.enum(['white', 'black']);
export const PieceTypeEnum = z.enum(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']);
export const PawnPromotionEnum = PieceAliasEnum.exclude(['p', 'P', 'k', 'K']);

export type CastleSide = z.infer<typeof CastleSideEnum>;
export type PieceAlias = z.infer<typeof PieceAliasEnum>;
export type PieceColor = z.infer<typeof PieceColorEnum>;
export type PieceType = z.infer<typeof PieceTypeEnum>;
export type PawnPromotion = z.infer<typeof PawnPromotionEnum>;

export const PieceSchema = z.object({
    alias: PieceAliasEnum,
    startingIndices: z.array(BoardIndexSchema),
    color: PieceColorEnum,
    type: z.enum(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']),
    value: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(9), z.literal(10)]),
});
export type Piece = z.infer<typeof PieceSchema>;

export const CastleRightsSchema = z.object({
    [CastleSideEnum.enum.short]: z.boolean(),
    [CastleSideEnum.enum.long]: z.boolean(),
});
export type CastleRights = z.infer<typeof CastleRightsSchema>;
export type CastleLegality = CastleRights;

export const CastleRightsByColorSchema = z.object({
    [PieceColorEnum.enum.white]: CastleRightsSchema,
    [PieceColorEnum.enum.black]: CastleRightsSchema,
});
export type CastleRightsByColor = z.infer<typeof CastleRightsByColorSchema>;

export const ChessBoardSchema = z
    .array(PieceAliasEnum.optional())
    .length(NUM_SQUARES)
    .describe('Array of piece aliases representing the chess board. Empty squares are undefined');
export type ChessBoardType = z.infer<typeof ChessBoardSchema>;

export const ChessBoardStateSchema = z.object({
    board: ChessBoardSchema,
    playerTurn: PieceColorEnum.describe('Color of the player whose turn it is to move'),
    castleRightsByColor: CastleRightsByColorSchema.describe('Castling rights for both colors'),
    enPassantTargetIndex: BoardIndexSchema.nullable().describe(
        'The index of the en passant target square, or null if none'
    ),
    halfmoveClock: z
        .number()
        .int()
        .nonnegative()
        .describe('The number of half-moves since the last capture or pawn advance'),
    fullmoveClock: z.number().int().positive().describe('The number of full moves in the game'),
});
export type ChessBoardState = z.infer<typeof ChessBoardStateSchema>;

export const ChessGameSchema = z.object({
    boardState: ChessBoardStateSchema,
    moveHistory: z.array(z.string()).describe('List of moves in UCI long algebraic notation e.g., e2e4'),
});
export type ChessGame = z.infer<typeof ChessGameSchema>;

export const MoveTypeEnum = z.enum(['standard', 'capture', 'short-castle', 'long-castle', 'en-passant']);
export type MoveType = z.infer<typeof MoveTypeEnum>;

export const MoveSchema = z.object({
    startIndex: BoardIndexSchema,
    endIndex: BoardIndexSchema,
    type: MoveTypeEnum,
    piece: PieceSchema,
    capturedPiece: PieceSchema.optional(),
    captureIndex: BoardIndexSchema.optional(),
    promotion: PawnPromotionEnum.optional(),
});
export type Move = z.infer<typeof MoveSchema>;

export const LegalMovesStoreSchema = z.object({
    allMoves: z.array(MoveSchema).describe('All legal moves for the current player for the current board state'),
    byStartIndex: z.record(BoardIndexSchema, z.array(MoveSchema)).describe('Legal moves indexed by their start index'),
    byEndIndex: z.record(BoardIndexSchema, z.array(MoveSchema)).describe('Legal moves indexed by their end index'),
    typeAndEndIndexToStartIndex: z
        .record(z.string(), z.array(BoardIndexSchema))
        .describe(
            'Legal moves indexed by a key combining move type and end index to list of start indices. Useful for disambiguating moves for algebraic notation.'
        ),
});
export type LegalMovesStore = z.infer<typeof LegalMovesStoreSchema>;
