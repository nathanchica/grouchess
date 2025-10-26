import { useReducer, useContext, createContext, type ReactNode } from 'react';

import {
    algebraicNotationToIndex,
    computeAllLegalMoves,
    computeEnPassantTargetIndex,
    computeNextChessBoardFromMove,
    createBoardFromFEN,
    createInitialChessBoard,
    getPiece,
    isKingInCheck,
    isPromotionSquare,
} from '@grouchess/chess';
import type {
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    LegalMovesStore,
    Move,
    PawnPromotion,
    Piece,
    PieceColor,
} from '@grouchess/chess';
import invariant from 'tiny-invariant';

import { computeForcedDrawStatus, createRepetitionKeyFromBoardState } from '../utils/draws';
import { computeCastleRightsChangesFromMove } from '../utils/moves';
import { createAlgebraicNotation, isValidFEN, type MoveNotation } from '../utils/notations';

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
        | 'threefold-repetition'
        | 'insufficient-material';
    winner?: PieceColor;
    check?: PieceColor;
};

type EndGameReason = Extract<GameStatus['status'], 'draw-by-agreement' | 'resigned' | 'time-out'>;

type State = ChessBoardState & {
    // Indices of the squares involved in the previous move used for highlighting
    previousMoveIndices: number[];
    // Array of captured pieces
    captures: CaptureProps[];
    // History of moves in various notations
    moveHistory: MoveNotation[];
    // Version number to force re-renders when resetting/loading games
    timelineVersion: number;
    // Pending promotion info (if a pawn has reached the last rank and is awaiting promotion choice)
    pendingPromotion: { move: Move; preBoard: ChessBoardType; prePreviousMoveIndices: number[] } | null;
    // Current game status derived from the board state
    gameStatus: GameStatus;
    // Store of legal moves for the current player
    legalMovesStore: LegalMovesStore;
    // Counts of positions (FEN strings) for threefold repetition detection
    positionCounts: Record<string, number>;
};

type Action =
    | { type: 'reset' }
    | { type: 'move-piece'; move: Move }
    | { type: 'promote-pawn'; pawnPromotion: PawnPromotion }
    | { type: 'cancel-promotion' }
    | { type: 'load-fen'; fenString: string }
    | { type: 'end-game'; reason: EndGameReason; winner?: PieceColor };

export type ChessGameContextType = State & {
    resetGame: () => void;
    movePiece: (move: Move) => void;
    promotePawn: (pawnPromotion: PawnPromotion) => void;
    cancelPromotion: () => void;
    loadFEN: (fenString: string) => void;
    endGame: (reason: EndGameReason, winner?: PieceColor) => void;
};

function computeGameStatusFromState({
    board,
    playerTurn,
    halfmoveClock,
    legalMovesStore,
    positionCounts,
}: State): GameStatus {
    const isInCheck = isKingInCheck(board, playerTurn);
    const hasNoLegalMoves = legalMovesStore.allMoves.length === 0;
    if (isInCheck && hasNoLegalMoves) {
        return {
            status: 'checkmate',
            winner: playerTurn === 'white' ? 'black' : 'white',
            check: playerTurn,
        };
    }
    const forcedDrawStatus = computeForcedDrawStatus(board, hasNoLegalMoves, halfmoveClock, positionCounts);
    if (forcedDrawStatus) {
        return { status: forcedDrawStatus };
    } else if (isInCheck) {
        return {
            status: 'in-progress',
            check: playerTurn,
        };
    }

    return { status: 'in-progress' };
}

function createInitialCastleRights(): CastleRightsByColor {
    return {
        white: { short: true, long: true },
        black: { short: true, long: true },
    };
}

function createInitialChessGame(): State {
    const boardState = {
        board: createInitialChessBoard(),
        playerTurn: 'white' as PieceColor,
        castleRightsByColor: createInitialCastleRights(),
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
    };
    const positionKey = createRepetitionKeyFromBoardState(boardState);

    return {
        ...boardState,
        previousMoveIndices: [],
        captures: [],
        moveHistory: [],
        timelineVersion: 0,
        pendingPromotion: null,
        gameStatus: {
            status: 'in-progress',
        },
        legalMovesStore: computeAllLegalMoves(boardState),
        positionCounts: { [positionKey]: 1 },
    };
}

function createChessGameFromFEN(fenString: string): State {
    if (!isValidFEN(fenString)) {
        throw new Error('Invalid FEN string');
    }

    const parts = fenString.trim().split(/\s+/);
    invariant(parts.length === 6, 'FEN must have exactly 6 fields');
    const [placementPart, activeColorPart, castlingPart, enPassantPart, halfmovePart, fullmovePart] = parts;

    const boardState: ChessBoardState = {
        board: createBoardFromFEN(placementPart),
        playerTurn: activeColorPart === 'w' ? 'white' : 'black',
        castleRightsByColor:
            castlingPart === '-'
                ? {
                      white: { short: false, long: false },
                      black: { short: false, long: false },
                  }
                : {
                      white: {
                          short: castlingPart.includes('K'),
                          long: castlingPart.includes('Q'),
                      },
                      black: {
                          short: castlingPart.includes('k'),
                          long: castlingPart.includes('q'),
                      },
                  },
        enPassantTargetIndex: enPassantPart === '-' ? null : algebraicNotationToIndex(enPassantPart),
        halfmoveClock: parseInt(halfmovePart, 10),
        fullmoveClock: parseInt(fullmovePart, 10),
    };
    const positionKey = createRepetitionKeyFromBoardState(boardState);

    const state: State = {
        ...boardState,
        previousMoveIndices: [],
        captures: [],
        moveHistory: [],
        timelineVersion: 0,
        pendingPromotion: null,
        gameStatus: { status: 'in-progress' },
        legalMovesStore: computeAllLegalMoves(boardState),
        positionCounts: { [positionKey]: 1 },
    };

    return { ...state, gameStatus: computeGameStatusFromState(state) };
}

const ChessGameContext = createContext<ChessGameContextType>({
    ...createInitialChessGame(),
    resetGame: () => {},
    movePiece: () => {},
    promotePawn: () => {},
    cancelPromotion: () => {},
    loadFEN: () => {},
    endGame: () => {},
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
                positionCounts,
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

            const boardState: ChessBoardState = {
                board: nextBoard,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                castleRightsByColor: nextCastleRights,
                enPassantTargetIndex: isPawnMove ? computeEnPassantTargetIndex(startIndex, endIndex) : null,
                halfmoveClock: pieceType === 'pawn' || type === 'capture' ? 0 : halfmoveClock + 1,
                fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
            };
            const positionKey = createRepetitionKeyFromBoardState(boardState);

            const nextState: State = {
                ...state,
                ...boardState,
                previousMoveIndices: [startIndex, endIndex],
                captures: captureProps ? [...captures, captureProps] : captures,
                legalMovesStore: computeAllLegalMoves(boardState),
                positionCounts:
                    boardState.halfmoveClock === 0
                        ? { [positionKey]: 1 }
                        : { ...positionCounts, [positionKey]: (positionCounts[positionKey] ?? 0) + 1 },
            };

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

            const boardState: ChessBoardState = {
                board: updatedBoard,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                castleRightsByColor: state.castleRightsByColor,
                enPassantTargetIndex: null,
                halfmoveClock: 0, // promotion is always a pawn move
                fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
            };
            const positionKey = createRepetitionKeyFromBoardState(boardState);

            const nextState: State = {
                ...state,
                board: updatedBoard,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                captures: nextCaptures,
                pendingPromotion: null,
                halfmoveClock: 0, // promotion is always a pawn move
                fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
                legalMovesStore: computeAllLegalMoves(boardState),
                positionCounts: {
                    ...state.positionCounts,
                    [positionKey]: (state.positionCounts[positionKey] ?? 0) + 1,
                },
            };

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
        case 'end-game': {
            return {
                ...state,
                gameStatus: {
                    status: action.reason,
                    winner: action.winner,
                    // Preserve checks
                    check: state.gameStatus.check,
                },
            };
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

    function endGame(reason: EndGameReason, winner?: PieceColor) {
        dispatch({ type: 'end-game', reason, winner });
    }

    const contextValue = {
        ...state,
        resetGame,
        movePiece,
        promotePawn,
        cancelPromotion,
        loadFEN,
        endGame,
    };

    return <ChessGameContext.Provider value={contextValue}>{children}</ChessGameContext.Provider>;
}

export default ChessGameProvider;
