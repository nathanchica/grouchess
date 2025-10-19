import { useReducer, useContext, createContext, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

import {
    computeEnPassantTargetIndex,
    isPromotionSquare,
    NUM_SQUARES,
    type ChessBoardType,
    createBoardFromFEN,
    algebraicNotationToIndex,
} from '../utils/board';
import {
    computeAllLegalMoves,
    computeCastleRightsChangesFromMove,
    computeNextChessBoardFromMove,
    isKingInCheck,
    createCastleRightsFromFEN,
    type CastleRightsByColor,
    type LegalMovesStore,
    type Move,
} from '../utils/moves';
import { createAlgebraicNotation, type MoveNotation } from '../utils/notations';
import { aliasToPieceData, type Piece, type PieceColor, type PawnPromotion, getPiece } from '../utils/pieces';

type CaptureProps = {
    piece: Piece;
    moveIndex: number;
};

export type GameStatus = {
    status:
        | 'in-progress'
        | 'checkmate'
        | 'stalemate'
        | '50-move-draw'
        | 'draw-by-agreement'
        | 'resigned'
        | 'time-out'
        | 'threefold-repetition';
    winner?: PieceColor;
    check?: PieceColor;
};

type State = {
    board: ChessBoardType;
    playerTurn: PieceColor;
    castleRightsByColor: CastleRightsByColor;
    // index that was skipped by a pawn that moved two squares in the previous move
    enPassantTargetIndex: number | null;
    // Half-move clock (plies since last pawn move or capture)
    halfmoveClock: number;
    // Full-move number (increments after each black move)
    fullmoveClock: number;
    previousMoveIndices: number[];
    captures: CaptureProps[];
    moveHistory: MoveNotation[];
    timelineVersion: number;
    pendingPromotion: { move: Move; preBoard: ChessBoardType; prePreviousMoveIndices: number[] } | null;
    gameStatus: GameStatus;
    // Store of legal moves for the current player
    legalMovesStore: LegalMovesStore;
};

type Action =
    | { type: 'reset' }
    | { type: 'move-piece'; move: Move }
    | { type: 'promote-pawn'; pawnPromotion: PawnPromotion }
    | { type: 'cancel-promotion' }
    | { type: 'load-fen'; fenString: string };

export type ChessGameContextType = State & {
    resetGame: () => void;
    movePiece: (move: Move) => void;
    promotePawn: (pawnPromotion: PawnPromotion) => void;
    cancelPromotion: () => void;
    loadFEN: (fenString: string) => void;
};

/**
 * fifty consecutive moves (i.e. 100 single moves) occuring without any capture or any pawn move
 * https://www.janko.at/Retros/Glossary/FiftyMoves.htm
 */
const FIFTY_MOVE_RULE_HALFMOVES = 100;

function computeGameStatusFromState({ board, playerTurn, halfmoveClock, legalMovesStore }: State): GameStatus {
    const isInCheck = isKingInCheck(board, playerTurn);
    const hasNoLegalMoves = legalMovesStore.allMoves.length === 0;
    if (isInCheck && hasNoLegalMoves) {
        return {
            status: 'checkmate',
            winner: playerTurn === 'white' ? 'black' : 'white',
            check: playerTurn,
        };
    } else if (hasNoLegalMoves) {
        return { status: 'stalemate' };
    } else if (halfmoveClock >= FIFTY_MOVE_RULE_HALFMOVES) {
        return { status: '50-move-draw' };
    } else if (isInCheck) {
        return {
            status: 'in-progress',
            check: playerTurn,
        };
    }

    return { status: 'in-progress' };
}

/**
 * r | n | b | q | k | b | n | r  (0 - 7)
 * ------------------------------
 * p | p | p | p | p | p | p | p  (8 - 15)
 * ------------------------------
 *   |   |   |   |   |   |   |    (16 - 23)
 * ------------------------------
 *   |   |   |   |   |   |   |    (24 - 31)
 * ------------------------------
 *   |   |   |   |   |   |   |    (32 - 39)
 * ------------------------------
 *   |   |   |   |   |   |   |    (40 - 47)
 * ------------------------------
 * P | P | P | P | P | P | P | P  (48 - 55)
 * ------------------------------
 * R | N | B | Q | K | B | N | R  (56 - 63)
 */
function createInitialBoard(): ChessBoardType {
    const board: ChessBoardType = Array(NUM_SQUARES).fill(undefined);
    Object.values(aliasToPieceData).forEach(({ shortAlias, startingIndices }) => {
        startingIndices.forEach((index) => {
            board[index] = shortAlias;
        });
    });
    return board;
}

function createInitialCastleRights(): CastleRightsByColor {
    return {
        white: { canShortCastle: true, canLongCastle: true },
        black: { canShortCastle: true, canLongCastle: true },
    };
}

export function createInitialChessGame(): State {
    const initialState: Omit<State, 'legalMovesStore'> = {
        board: createInitialBoard(),
        playerTurn: 'white',
        castleRightsByColor: createInitialCastleRights(),
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
        previousMoveIndices: [],
        captures: [],
        moveHistory: [],
        timelineVersion: 0,
        pendingPromotion: null,
        gameStatus: {
            status: 'in-progress',
        },
    };
    return {
        ...initialState,
        legalMovesStore: computeAllLegalMoves(
            initialState.board,
            initialState.playerTurn,
            initialState.castleRightsByColor,
            initialState.enPassantTargetIndex
        ),
    };
}

export function createChessGameFromFEN(fenString: string): State {
    const parts = fenString.trim().split(/\s+/);
    invariant(parts.length >= 4, 'FEN must have at least 4 fields');
    const [placementPart, activeColorPart, castlingPart, enPassantPart, halfmovePart, fullmovePart] = parts;

    const board = createBoardFromFEN(placementPart);

    let playerTurn: PieceColor;
    if (activeColorPart === 'w') playerTurn = 'white';
    else if (activeColorPart === 'b') playerTurn = 'black';
    else invariant(false, 'Invalid FEN: active color must be w or b');

    const castleRightsByColor = createCastleRightsFromFEN(castlingPart ?? '-');

    const enPassantIndex = enPassantPart ? algebraicNotationToIndex(enPassantPart) : -1;
    const enPassantTargetIndex = enPassantIndex === -1 ? null : enPassantIndex;

    const halfmoveClock = halfmovePart !== undefined ? parseInt(halfmovePart, 10) : 0;
    invariant(Number.isFinite(halfmoveClock) && halfmoveClock >= 0, 'Invalid FEN: halfmove clock');

    const fullmoveClock = fullmovePart !== undefined ? parseInt(fullmovePart, 10) : 1;
    invariant(Number.isFinite(fullmoveClock) && fullmoveClock >= 1, 'Invalid FEN: fullmove number');

    const legalMovesStore = computeAllLegalMoves(board, playerTurn, castleRightsByColor, enPassantTargetIndex);

    const state: State = {
        board,
        playerTurn,
        castleRightsByColor,
        enPassantTargetIndex,
        halfmoveClock,
        fullmoveClock,
        previousMoveIndices: [],
        captures: [],
        moveHistory: [],
        timelineVersion: 0,
        pendingPromotion: null,
        gameStatus: { status: 'in-progress' },
        legalMovesStore,
    };

    const gameStatus = computeGameStatusFromState(state);

    return { ...state, gameStatus };
}

const ChessGameContext = createContext<ChessGameContextType>({
    ...createInitialChessGame(),
    resetGame: () => {},
    movePiece: () => {},
    promotePawn: () => {},
    cancelPromotion: () => {},
    loadFEN: () => {},
});

export function useChessGame(): ChessGameContextType {
    const context = useContext(ChessGameContext);
    invariant(context, 'useChessGame must be used within ChessGameProvider');
    return context;
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'reset':
            return { ...createInitialChessGame(), timelineVersion: state.timelineVersion + 1 };
        case 'move-piece': {
            const { move } = action;
            const {
                board,
                castleRightsByColor,
                playerTurn,
                halfmoveClock,
                fullmoveClock,
                previousMoveIndices,
                captures,
                moveHistory,
                legalMovesStore,
            } = state;
            const { startIndex, endIndex, type, capturedPiece, piece } = move;
            const { type: pieceType } = piece;

            let captureProps = null;
            if (type === 'capture' || type === 'en-passant') {
                invariant(capturedPiece, 'Move type:capture must have a capturedPiece');
                captureProps = { piece: capturedPiece, moveIndex: moveHistory.length };
            }

            const nextBoard = computeNextChessBoardFromMove(board, move);

            // If pawn reached last rank, pause for promotion selection.
            const isPawnMove = pieceType === 'pawn';
            if (isPawnMove && isPromotionSquare(endIndex, playerTurn)) {
                return {
                    ...state,
                    board: nextBoard,
                    // Do not update captures/moveHistory/playerTurn yet; finalize after promotion
                    previousMoveIndices: [startIndex, endIndex],
                    pendingPromotion: { move, preBoard: board, prePreviousMoveIndices: previousMoveIndices },
                };
            }

            const rightsDiff = computeCastleRightsChangesFromMove(move);
            const nextCastleRights: CastleRightsByColor = {
                white: { ...castleRightsByColor.white, ...(rightsDiff.white ?? {}) },
                black: { ...castleRightsByColor.black, ...(rightsDiff.black ?? {}) },
            };

            const nextState: State = {
                ...state,
                board: nextBoard,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                castleRightsByColor: nextCastleRights,
                enPassantTargetIndex: isPawnMove ? computeEnPassantTargetIndex(startIndex, endIndex) : null,
                halfmoveClock: pieceType === 'pawn' || type === 'capture' ? 0 : halfmoveClock + 1,
                fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
                previousMoveIndices: [startIndex, endIndex],
                captures: captureProps ? [...captures, captureProps] : captures,
            };
            nextState.legalMovesStore = computeAllLegalMoves(
                nextState.board,
                nextState.playerTurn,
                nextState.castleRightsByColor,
                nextState.enPassantTargetIndex
            );
            const gameStatus = computeGameStatusFromState(nextState);

            /**
             * Create move notation for the move just made using:
             * - post-move game state (effect of the move on the board, check/checkmate, etc.)
             * - pre-move legal moves store (for disambiguation of the move)
             */
            const moveNotation: MoveNotation = {
                algebraicNotation: createAlgebraicNotation(move, gameStatus, legalMovesStore),
                figurineAlgebraicNotation: createAlgebraicNotation(move, gameStatus, legalMovesStore, true),
            };

            return {
                ...nextState,
                gameStatus,
                moveHistory: [...moveHistory, moveNotation],
            };
        }
        case 'promote-pawn': {
            const { pawnPromotion } = action;
            const { board, playerTurn, fullmoveClock, captures, pendingPromotion, moveHistory, legalMovesStore } =
                state;
            invariant(pendingPromotion, 'No pending promotion to apply');

            const { move } = pendingPromotion;
            const { endIndex, piece, type, capturedPiece } = move;
            invariant(piece.type === 'pawn', 'Pending promotion move must be a pawn move');
            invariant(piece.color === getPiece(pawnPromotion).color, 'Promotion piece color must match pawn color');

            const updatedBoard = [...board];
            updatedBoard[endIndex] = pawnPromotion;

            let nextCaptures = captures;
            if (type === 'capture') {
                invariant(capturedPiece, 'Move type:capture must have a capturedPiece');
                nextCaptures = [...captures, { piece: capturedPiece, moveIndex: moveHistory.length }];
            }

            const nextState: State = {
                ...state,
                board: updatedBoard,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                captures: nextCaptures,
                pendingPromotion: null,
                halfmoveClock: 0, // promotion is always a pawn move
                fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
            };
            nextState.legalMovesStore = computeAllLegalMoves(
                nextState.board,
                nextState.playerTurn,
                nextState.castleRightsByColor,
                nextState.enPassantTargetIndex
            );
            const gameStatus = computeGameStatusFromState(nextState);
            const moveWithPromotion: Move = { ...move, promotion: pawnPromotion };

            /**
             * Create move notation for the move just made using:
             * - post-move game state (effect of the move on the board, check/checkmate, etc.)
             * - pre-move legal moves store (for disambiguation of the move)
             */
            const moveNotation: MoveNotation = {
                algebraicNotation: createAlgebraicNotation(moveWithPromotion, gameStatus, legalMovesStore),
                figurineAlgebraicNotation: createAlgebraicNotation(
                    moveWithPromotion,
                    gameStatus,
                    legalMovesStore,
                    true
                ),
            };

            return {
                ...nextState,
                gameStatus,
                moveHistory: [...moveHistory, moveNotation],
            };
        }
        case 'cancel-promotion': {
            const { pendingPromotion } = state;
            invariant(pendingPromotion, 'No pending promotion to cancel');
            const { preBoard, prePreviousMoveIndices } = pendingPromotion;
            return {
                ...state,
                board: preBoard,
                previousMoveIndices: prePreviousMoveIndices,
                pendingPromotion: null,
            };
        }
        case 'load-fen': {
            return { ...createChessGameFromFEN(action.fenString), timelineVersion: state.timelineVersion + 1 };
        }
        default:
            return state;
    }
}

type Props = {
    children: ReactNode;
};

function ChessGameProvider({ children }: Props) {
    const [state, dispatch] = useReducer(reducer, createInitialChessGame());

    function resetGame() {
        dispatch({ type: 'reset' });
    }

    function movePiece(move: Move) {
        dispatch({ type: 'move-piece', move });
    }

    function promotePawn(pawnPromotion: PawnPromotion) {
        dispatch({ type: 'promote-pawn', pawnPromotion });
    }

    function cancelPromotion() {
        dispatch({ type: 'cancel-promotion' });
    }

    function loadFEN(fenString: string) {
        dispatch({ type: 'load-fen', fenString });
    }

    const contextValue = {
        ...state,
        resetGame,
        movePiece,
        promotePawn,
        cancelPromotion,
        loadFEN,
    };

    return <ChessGameContext.Provider value={contextValue}>{children}</ChessGameContext.Provider>;
}

export default ChessGameProvider;
