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
export { computeAllLegalMoves, computeNextChessBoardFromMove, createMove, isKingInCheck } from './moves.js';
export { getPiece, isValidPieceAlias } from './pieces.js';
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
    PawnPromotionEnum,
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
    PawnPromotion,
    PieceAlias,
    PieceColor,
    Piece,
    RowCol,
} from './schema.js';
