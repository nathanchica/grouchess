export { createInitialChessBoard, indexToRowCol, rowColToIndex, isRowColInBounds } from './board.js';
export { computeAllLegalMoves, computeNextChessBoardFromMove, createMove, isKingInCheck } from './moves.js';
export {
    CastleRightsSchema,
    CastleRightsByColorSchema,
    ChessBoardSchema,
    ChessBoardStateSchema,
    ChessGameSchema,
    LegalMovesStoreSchema,
    MoveSchema,
    NUM_SQUARES,
    NUM_COLS,
    NUM_ROWS,
    PieceAliasEnum,
    PieceColorEnum,
    PieceSchema,
} from './schema.js';

export type {
    CastleRights,
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    LegalMovesStore,
    Move,
    MoveType,
    PieceAlias,
    PieceColor,
    Piece,
} from './schema.js';
