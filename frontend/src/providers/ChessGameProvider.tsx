import { useReducer, useContext, createContext, type ReactNode } from 'react';
import invariant from 'tiny-invariant';

import { NUM_SQUARES, type ChessBoardType } from '../utils/board';
import {
    computeNextChessBoardFromMove,
    computeCastleMetadataChangesFromMove,
    type CastleMetadata,
    type Move,
} from '../utils/moves';
import { aliasToPieceData, type Piece, type PieceColor } from '../utils/pieces';

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
    moveHistory: Move[];
    timelineVersion: number;
};

type Action = { type: 'reset' } | { type: 'move-piece'; move: Move };

export type ChessGameContextType = State & {
    resetGame: () => void;
    movePiece: (move: Move) => void;
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
        case 'move-piece': {
            const { move } = action;
            const { board, castleMetadata, captures, playerTurn, moveHistory } = state;
            const { startIndex, endIndex, type, capturedPiece, piece } = move;
            const { type: pieceType } = piece;

            let captureProps = null;
            if (type === 'capture' || type === 'en-passant') {
                invariant(capturedPiece, 'Move type:capture must have a capturedPiece');
                captureProps = { piece: capturedPiece, moveIndex: moveHistory.length };
            }

            const nextBoard = computeNextChessBoardFromMove(board, move);

            const nextCastleMetadata =
                pieceType === 'king' || pieceType === 'rook'
                    ? {
                          ...castleMetadata,
                          ...computeCastleMetadataChangesFromMove(move),
                      }
                    : castleMetadata;

            const nextCaptureProps = captureProps ? [...captures, captureProps] : captures;

            const nextMoveHistory = [...moveHistory, move];

            return {
                ...state,
                board: nextBoard,
                castleMetadata: nextCastleMetadata,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                previousMoveIndices: [startIndex, endIndex],
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

    function movePiece(move: Move) {
        dispatch({ type: 'move-piece', move });
    }

    const contextValue = {
        ...state,
        resetGame,
        movePiece,
    };

    return <ChessGameContext.Provider value={contextValue}>{children}</ChessGameContext.Provider>;
}

export default ChessGameProvider;
