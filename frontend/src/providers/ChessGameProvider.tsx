import { useReducer, useContext, createContext, type ReactNode } from 'react';
import invariant from 'tiny-invariant';

import { NUM_SQUARES, type ChessBoardType } from '../utils/board';
import {
    computeNextChessBoardFromMove,
    computeCastleMetadataChangesFromMove,
    type CastleMetadata,
} from '../utils/moves';
import { aliasToPieceData, getPiece, type Piece, type PieceColor } from '../utils/pieces';

type CaptureProps = {
    piece: Piece;
    moveIndex: number;
};

type State = {
    board: ChessBoardType;
    castleMetadata: CastleMetadata;
    playerTurn: PieceColor;
    previousMoveIndices: number[];
    captures: CaptureProps[];
    moveHistory: number[][];
    timelineVersion: number;
};

type Action = { type: 'reset' } | { type: 'move'; prevIndex: number; nextIndex: number };

export type ChessGameContextType = State & {
    resetGame: () => void;
    movePiece: (prevIndex: number, nextIndex: number) => void;
};

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

function createInitialCastleMetadata(): CastleMetadata {
    return {
        whiteKingHasMoved: false,
        whiteShortRookHasMoved: false,
        whiteLongRookHasMoved: false,
        blackKingHasMoved: false,
        blackShortRookHasMoved: false,
        blackLongRookHasMoved: false,
    };
}

export function createInitialChessGame(): State {
    return {
        board: createInitialBoard(),
        castleMetadata: createInitialCastleMetadata(),
        playerTurn: 'white',
        previousMoveIndices: [],
        captures: [],
        moveHistory: [],
        timelineVersion: 0,
    };
}

const ChessGameContext = createContext<ChessGameContextType>({
    ...createInitialChessGame(),
    resetGame: () => {},
    movePiece: () => {},
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
        case 'move': {
            const { prevIndex, nextIndex } = action;
            const { board, castleMetadata, captures, playerTurn, moveHistory } = state;
            const pieceAlias = board[prevIndex];
            invariant(pieceAlias, 'Invalid use of movePiece. prevIndex does not contain a piece.');
            const pieceData = getPiece(pieceAlias);

            const capturedAlias = board[nextIndex];
            const captureProps = capturedAlias
                ? { piece: getPiece(capturedAlias), moveIndex: moveHistory.length }
                : null;
            const nextBoard = computeNextChessBoardFromMove(prevIndex, nextIndex, board);

            const nextCastleMetadata =
                pieceData.type === 'king' || pieceData.type === 'rook'
                    ? {
                          ...castleMetadata,
                          ...computeCastleMetadataChangesFromMove(pieceData, prevIndex),
                      }
                    : castleMetadata;

            const nextCaptureProps = captureProps ? [...captures, captureProps] : captures;

            const nextMoveHistory = [...moveHistory, [prevIndex, nextIndex]];

            return {
                ...state,
                board: nextBoard,
                castleMetadata: nextCastleMetadata,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                previousMoveIndices: [prevIndex, nextIndex],
                captures: nextCaptureProps,
                moveHistory: nextMoveHistory,
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

    function movePiece(prevIndex: number, nextIndex: number) {
        dispatch({ type: 'move', prevIndex, nextIndex });
    }

    const contextValue = {
        ...state,
        resetGame,
        movePiece,
    };

    return <ChessGameContext.Provider value={contextValue}>{children}</ChessGameContext.Provider>;
}

export default ChessGameProvider;
