export {
    algebraicNotationToIndex,
    computeEnPassantTargetIndex,
    createBoardFromFEN,
    createInitialChessBoard,
    getKingIndices,
    indexToRowCol,
    isPromotionSquare,
    isRowColInBounds,
    rowColToIndex,
} from './board.js';
export { computeCastleRightsChangesFromMove, createInitialCastleRights } from './castles.js';
export { computeAllLegalMoves, computeNextChessBoardFromMove, createMove, isKingInCheck } from './moves.js';
export { getColorFromAlias, getPiece, isValidPieceAlias } from './pieces.js';
export {
    BoardIndexSchema,
    CastleRightsSchema,
    CastleRightsByColorSchema,
    ChessBoardSchema,
    ChessBoardStateSchema,
    ChessGameSchema,
    LegalMovesStoreSchema,
    MoveSchema,
    MoveNotationSchema,
    MoveRecordSchema,
    NUM_SQUARES,
    NUM_COLS,
    NUM_ROWS,
    PawnPromotionEnum,
    PieceAliasEnum,
    PieceColorEnum,
    PieceSchema,
} from './schema.js';

export type {
    BoardIndex,
    CastleRights,
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    LegalMovesStore,
    Move,
    MoveNotation,
    MoveRecord,
    MoveType,
    PawnPromotion,
    PieceAlias,
    PieceColor,
    Piece,
    RowCol,
} from './schema.js';
