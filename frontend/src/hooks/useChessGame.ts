import { useState } from 'react';
import invariant from 'tiny-invariant';

import { NUM_SQUARES, type ChessBoardType } from '../utils/board';
import {
    computeNextChessBoardFromMove,
    computeCastleMetadataChangesFromMove,
    type CastleMetadata,
} from '../utils/moves';
import { aliasToPieceData, getPiece, type PieceColor } from '../utils/pieces';

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
    resetGame: () => void;
    movePiece: (prevIndex: number, nextIndex: number) => void;
};

export function useChessGame(): Payload {
    const [board, setBoard] = useState<ChessBoardType>(createInitialBoard);
    const [castleMetadata, setCastleMetadata] = useState<CastleMetadata>(createInitialCastleMetadata);
    const [playerTurn, setPlayerTurn] = useState<PieceColor>('white');
    const [previousMoveIndices, setPreviousMoveIndices] = useState<number[]>([]);

    function resetGame() {
        setBoard(createInitialBoard);
        setCastleMetadata(createInitialCastleMetadata);
        setPlayerTurn('white');
        setPreviousMoveIndices([]);
    }

    function movePiece(prevIndex: number, nextIndex: number) {
        const pieceAlias = board[prevIndex];
        invariant(pieceAlias, 'Invalid use of movePiece. prevIndex does not contain a piece.');

        const pieceData = getPiece(pieceAlias);

        setBoard((prevBoard) => computeNextChessBoardFromMove(pieceData, prevIndex, nextIndex, prevBoard));
        if (pieceData.type === 'king' || pieceData.type === 'rook') {
            setCastleMetadata((prevData) => ({
                ...prevData,
                ...computeCastleMetadataChangesFromMove(pieceData, prevIndex),
            }));
        }
        setPreviousMoveIndices([prevIndex, nextIndex]);
        setPlayerTurn((prevTurn) => (prevTurn === 'white' ? 'black' : 'white'));
    }

    return {
        board,
        castleMetadata,
        playerTurn,
        previousMoveIndices,
        resetGame,
        movePiece,
    };
}
