import { useReducer, useContext, createContext, type ReactNode } from 'react';

import {
    computeNextChessBoardFromMove,
    computeNextChessGameAfterMove,
    createChessGameFromFEN,
    createInitialChessGame,
    getPiece,
    isPromotionSquare,
} from '@grouchess/chess';
import type { ChessBoardState, ChessGame, EndGameReason, Move, PawnPromotion, PieceColor } from '@grouchess/chess';
import invariant from 'tiny-invariant';

type State = ChessBoardState &
    Omit<ChessGame, 'boardState'> & {
        // Indices of the squares involved in the previous move used for highlighting
        previousMoveIndices: number[];
        // Version number to force re-renders when resetting/loading games
        timelineVersion: number;
        // Pending promotion info (if a pawn has reached the last rank and is awaiting promotion choice)
        pendingPromotion: { move: Move; preChessGame: ChessGame; prePreviousMoveIndices: number[] } | null;
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

function createInitialState(): State {
    const { boardState, ...chessGame } = createInitialChessGame();

    return {
        ...boardState,
        ...chessGame,
        previousMoveIndices: [],
        timelineVersion: 0,
        pendingPromotion: null,
    };
}

const ChessGameContext = createContext<ChessGameContextType>({
    ...createInitialState(),
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
            return { ...createInitialState(), timelineVersion: state.timelineVersion + 1 };
        case 'move-piece': {
            const { move } = action;
            const {
                board,
                castleRightsByColor,
                enPassantTargetIndex,
                playerTurn,
                halfmoveClock,
                fullmoveClock,
                previousMoveIndices,
                captures,
                moveHistory,
                legalMovesStore,
                positionCounts,
                gameState,
            } = state;
            const { startIndex, endIndex, piece, promotion } = move;
            const { type: pieceType } = piece;

            const prevChessGame: ChessGame = {
                boardState: {
                    board,
                    playerTurn,
                    castleRightsByColor,
                    enPassantTargetIndex,
                    halfmoveClock,
                    fullmoveClock,
                },
                gameState,
                legalMovesStore,
                moveHistory,
                captures,
                positionCounts,
            };

            const nextBoard = computeNextChessBoardFromMove(board, move);
            const nextPreviousMoveIndices = [startIndex, endIndex];

            // If pawn reached last rank, pause to await promotion choice
            const isPawnMove = pieceType === 'pawn';
            if (isPawnMove && isPromotionSquare(endIndex, playerTurn) && !promotion) {
                // Do not update captures/moveHistory/playerTurn yet; finalize after promotion
                return {
                    ...state,
                    board: nextBoard,
                    previousMoveIndices: nextPreviousMoveIndices,
                    pendingPromotion: {
                        move,
                        preChessGame: prevChessGame,
                        prePreviousMoveIndices: previousMoveIndices,
                    },
                };
            }

            const { boardState: nextBoardState, ...nextChessGame } = computeNextChessGameAfterMove(prevChessGame, move);

            return {
                ...state,
                ...nextBoardState,
                ...nextChessGame,
                previousMoveIndices: nextPreviousMoveIndices,
            };
        }
        case 'promote-pawn': {
            const { pawnPromotion } = action;
            const { pendingPromotion } = state;
            invariant(pendingPromotion, 'No pending promotion to apply');

            const { move, preChessGame } = pendingPromotion;
            const {
                piece: { type: pieceType, color: pieceColor },
            } = move;
            invariant(pieceType === 'pawn', 'Pending promotion move must be a pawn move');
            invariant(pieceColor === getPiece(pawnPromotion).color, 'Promotion piece color must match pawn color');

            const moveWithPromotion: Move = { ...move, promotion: pawnPromotion };

            const { boardState: nextBoardState, ...nextChessGame } = computeNextChessGameAfterMove(
                preChessGame,
                moveWithPromotion
            );

            return {
                ...state,
                ...nextBoardState,
                ...nextChessGame,
                pendingPromotion: null,
            };
        }
        case 'cancel-promotion': {
            const { pendingPromotion } = state;
            invariant(pendingPromotion, 'No pending promotion to cancel');
            const { preChessGame, prePreviousMoveIndices } = pendingPromotion;
            return {
                ...state,
                board: preChessGame.boardState.board,
                previousMoveIndices: prePreviousMoveIndices,
                pendingPromotion: null,
            };
        }
        case 'load-fen': {
            const { boardState, ...chessGame } = createChessGameFromFEN(action.fenString);
            return {
                ...boardState,
                ...chessGame,
                timelineVersion: state.timelineVersion + 1,
                previousMoveIndices: [],
                pendingPromotion: null,
            };
        }
        case 'end-game': {
            return {
                ...state,
                gameState: {
                    status: action.reason,
                    winner: action.winner,
                    // Preserve checks
                    check: state.gameState.check,
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
    const [state, dispatch] = useReducer(reducer, createInitialState());

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
