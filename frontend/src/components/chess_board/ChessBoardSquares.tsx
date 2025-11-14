import { useMemo } from 'react';

import { getPiece } from '@grouchess/chess';
import { NUM_SQUARES, type BoardIndex, type ChessBoardType, type Move, type PieceColor } from '@grouchess/models';

import ChessPiece from './ChessPiece';
import ChessSquare from './chess_square/ChessSquare';
import { calculateGlowingSquares, updateGlowingSquaresForDragOver } from './utils/glowingSquare';

import { useImages } from '../../providers/ImagesProvider';

export type ChessBoardSquaresProps = {
    board: ChessBoardType;
    boardIsFlipped: boolean;
    pieceBeingDraggedIndex: number | null;
    dragOverIndex: number | null;
    previousMoveIndices: BoardIndex[];
    checkedColor: PieceColor | undefined;
    selectedIndex: BoardIndex | null;
    legalMovesForSelectedPieceByEndIndex: Record<BoardIndex, Move>;
};

function ChessBoardSquares({
    board,
    boardIsFlipped,
    pieceBeingDraggedIndex,
    dragOverIndex,
    previousMoveIndices,
    checkedColor,
    selectedIndex,
    legalMovesForSelectedPieceByEndIndex,
}: ChessBoardSquaresProps) {
    // Preload and decode piece images; hide until ready to avoid flicker
    const { isReady: isFinishedLoadingImages } = useImages();

    // Calculate base glowing squares (without drag state), memoized based on board states and selection
    const baseGlowingSquarePropsByIndex = useMemo(() => {
        const legalMoves = Object.values(legalMovesForSelectedPieceByEndIndex);
        return calculateGlowingSquares(board, previousMoveIndices, checkedColor, selectedIndex, legalMoves);
    }, [board, previousMoveIndices, checkedColor, selectedIndex, legalMovesForSelectedPieceByEndIndex]);

    // Calculate glowing squares with drag overlay, memoized based on dragOverIndex
    const glowingSquarePropsByIndex = useMemo(
        () => updateGlowingSquaresForDragOver(baseGlowingSquarePropsByIndex, dragOverIndex),
        [baseGlowingSquarePropsByIndex, dragOverIndex]
    );

    // Memoize board array to render based on flipped state
    const boardToRender = useMemo(() => {
        return boardIsFlipped ? [...board].reverse() : board;
    }, [board, boardIsFlipped]);

    return (
        <>
            {boardToRender.map((pieceAlias, visualIndex) => {
                const boardIndex = boardIsFlipped ? NUM_SQUARES - 1 - visualIndex : visualIndex;
                const pieceIsDragged = Boolean(pieceBeingDraggedIndex === boardIndex);
                const showChessPiece = isFinishedLoadingImages && pieceAlias && !pieceIsDragged;
                return (
                    <ChessSquare
                        key={`square-${visualIndex}`}
                        index={boardIndex}
                        glowingSquareProps={glowingSquarePropsByIndex[boardIndex]}
                        isFlipped={boardIsFlipped}
                    >
                        {showChessPiece ? <ChessPiece piece={getPiece(pieceAlias)} /> : null}
                    </ChessSquare>
                );
            })}
        </>
    );
}

export default ChessBoardSquares;
