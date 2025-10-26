import * as z from 'zod';

export const NUM_SQUARES = 64;
export const NUM_COLS = 8;
export const NUM_ROWS = 8;

export const PieceAliasEnum = z.enum(['p', 'r', 'n', 'b', 'q', 'k', 'P', 'R', 'N', 'B', 'Q', 'K']);
export const PieceColorEnum = z.enum(['white', 'black']);

export type PieceAlias = z.infer<typeof PieceAliasEnum>;
export type PieceColor = z.infer<typeof PieceColorEnum>;

export const PieceSchema = z.object({
    alias: PieceAliasEnum,
    startingIndices: z.array(
        z
            .number()
            .int()
            .min(0)
            .max(NUM_SQUARES - 1)
    ),
    color: PieceColorEnum,
    type: z.enum(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']),
    value: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(9), z.literal(10)]),
});
export type Piece = z.infer<typeof PieceSchema>;

export const CastleRightsSchema = z.object({
    canShortCastle: z.boolean(),
    canLongCastle: z.boolean(),
});
export type CastleRights = z.infer<typeof CastleRightsSchema>;

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

export const ChessGameSchema = z.object({
    board: ChessBoardSchema,
    playerTurn: PieceColorEnum.describe('Color of the player whose turn it is to move'),
    castleRightsByColor: CastleRightsByColorSchema.describe('Castling rights for both colors'),
    enPassantTargetIndex: z
        .number()
        .int()
        .min(0)
        .max(NUM_SQUARES - 1)
        .nullable()
        .describe('The index of the en passant target square, or null if none'),
    halfMoveClock: z
        .number()
        .int()
        .nonnegative()
        .describe('The number of half-moves since the last capture or pawn advance'),
    fullMoveNumber: z.number().int().positive().describe('The number of full moves in the game'),
    moveHistory: z.array(z.string()).describe('List of moves in UCI long algebraic notation e.g., e2e4'),
});
export type ChessGame = z.infer<typeof ChessGameSchema>;
