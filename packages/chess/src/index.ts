export {
    algebraicNotationToIndex,
    computeEnPassantTargetIndex,
    createBoardFromFEN,
    getKingIndices,
    indexToRowCol,
    INITIAL_CHESS_BOARD_FEN,
    isPromotionSquare,
    isRowColInBounds,
    rowColToIndex,
} from './board.js';
export { computeCastleRightsChangesFromMove, createInitialCastleRights } from './castles.js';
export { updateClockState } from './clocks.js';
export { hasInsufficientMatingMaterial, isDrawStatus } from './draws.js';
export { computeAllLegalMoves, computeNextChessBoardFromMove, createMove, isKingInCheck } from './moves.js';
export { createFEN, isValidFEN } from './notations.js';
export { getColorFromAlias, getPiece, isValidPieceAlias } from './pieces.js';
export {
    BoardIndexSchema,
    CastleRightsSchema,
    CastleRightsByColorSchema,
    ChessBoardSchema,
    ChessBoardStateSchema,
    ChessClockStateSchema,
    ChessGameSchema,
    ChessGameStateSchema,
    ChessGameStatusEnum,
    EndGameReasonEnum,
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
    ChessClockState,
    ChessGame,
    ChessGameState,
    ChessGameStatus,
    EndGameReason,
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

export {
    computeGameStatus,
    computeNextChessGameAfterMove,
    createChessGameFromFEN,
    createInitialBoardState,
    createInitialChessGame,
} from './state.js';
