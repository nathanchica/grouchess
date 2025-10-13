import { useReducer } from 'react';
import invariant from 'tiny-invariant';

import { NUM_SQUARES, type ChessBoardType } from '../utils/board';
import {
    computeNextChessBoardFromMove,
    computeCastleMetadataChangesFromMove,
    type CastleMetadata,
} from '../utils/moves';
import { aliasToPieceData, getPiece, type Piece, type PieceColor } from '../utils/pieces';

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

type Payload = {
    board: ChessBoardType;
    castleMetadata: CastleMetadata;
    playerTurn: PieceColor;
    previousMoveIndices: number[];
    whiteCapturedPieces: Piece[];
    blackCapturedPieces: Piece[];
    resetGame: () => void;
    movePiece: (prevIndex: number, nextIndex: number) => void;
};

type State = {
    board: ChessBoardType;
    castleMetadata: CastleMetadata;
    playerTurn: PieceColor;
    previousMoveIndices: number[];
    whiteCapturedPieces: Piece[];
    blackCapturedPieces: Piece[];
};

type Action = { type: 'reset' } | { type: 'move'; prevIndex: number; nextIndex: number };

function createInitialState(): State {
    return {
        board: createInitialBoard(),
        castleMetadata: createInitialCastleMetadata(),
        playerTurn: 'white',
        previousMoveIndices: [],
        whiteCapturedPieces: [],
        blackCapturedPieces: [],
    };
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'reset':
            return createInitialState();
        case 'move': {
            const { prevIndex, nextIndex } = action;
            const { board, castleMetadata, whiteCapturedPieces, blackCapturedPieces, playerTurn } = state;
            const pieceAlias = board[prevIndex];
            invariant(pieceAlias, 'Invalid use of movePiece. prevIndex does not contain a piece.');
            const pieceData = getPiece(pieceAlias);

            const capturedAlias = board[nextIndex];
            const capturedPiece = capturedAlias ? getPiece(capturedAlias) : null;
            const nextBoard = computeNextChessBoardFromMove(pieceData, prevIndex, nextIndex, board);

            const nextCastleMetadata =
                pieceData.type === 'king' || pieceData.type === 'rook'
                    ? {
                          ...castleMetadata,
                          ...computeCastleMetadataChangesFromMove(pieceData, prevIndex),
                      }
                    : castleMetadata;

            const nextWhiteCapturedPieces =
                capturedPiece?.color === 'white' ? [...whiteCapturedPieces, capturedPiece] : whiteCapturedPieces;
            const nextBlackCapturedPieces =
                capturedPiece?.color === 'black' ? [...blackCapturedPieces, capturedPiece] : blackCapturedPieces;

            return {
                board: nextBoard,
                castleMetadata: nextCastleMetadata,
                playerTurn: playerTurn === 'white' ? 'black' : 'white',
                previousMoveIndices: [prevIndex, nextIndex],
                whiteCapturedPieces: nextWhiteCapturedPieces,
                blackCapturedPieces: nextBlackCapturedPieces,
            };
        }
        default:
            return state;
    }
}

export function useChessGame(): Payload {
    const [state, dispatch] = useReducer(reducer, createInitialState());
    const { board, castleMetadata, playerTurn, previousMoveIndices, whiteCapturedPieces, blackCapturedPieces } = state;

    function resetGame() {
        dispatch({ type: 'reset' });
    }

    function movePiece(prevIndex: number, nextIndex: number) {
        dispatch({ type: 'move', prevIndex, nextIndex });
    }

    return {
        board,
        castleMetadata,
        playerTurn,
        previousMoveIndices,
        whiteCapturedPieces,
        blackCapturedPieces,
        resetGame,
        movePiece,
    };
}
