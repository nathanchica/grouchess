import { useMemo, useRef } from 'react';

import { getPiece } from '@grouchess/chess';
import { NUM_SQUARES } from '@grouchess/models';

import ChessPiece from './ChessPiece';
import GhostPiece from './GhostPiece';
import PawnPromotionPrompt from './PawnPromotionPrompt';
import ChessSquare from './chess_square/ChessSquare';

import { useChessBoardInteractions } from '../../hooks/useChessBoardInteractions';
import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useImages } from '../../providers/ImagesProvider';
import GameBoard from '../common/GameBoard';

export type DragProps = {
    pointerId: number;
    squareSize: number;
    boardRect: DOMRect; // cached to avoid layout thrashing on pointer move
    initialX: number; // initial pointer X for first render
    initialY: number; // initial pointer Y for first render
};

/**
 * ChessBoard
 *
 * Pointer-based drag-and-drop (desktop + touch):
 *  - On pointerdown over a player's piece, we capture the pointer to the board,
 *    render a ghost piece at pointer location, and update the highlighted square.
 *  - We compute the target index from board.getBoundingClientRect() and square size.
 *  - On pointerup, if the target is a legal move, we call movePiece.
 *  - `touch-action: none` on the board prevents default scrolling during drags.
 * Click-to-move continues to work alongside dragging.
 */
function ChessBoard() {
    // Preload and decode piece images; hide until ready to avoid flicker
    const { isReady: isFinishedLoadingImages } = useImages();
    const { chessGame, movePiece } = useChessGame();
    const { gameRoom, currentPlayerColor } = useGameRoom();

    const boardRef = useRef<HTMLDivElement | null>(null);
    const ghostPieceRef = useRef<HTMLDivElement | null>(null);

    const { boardState, previousMoveIndices, pendingPromotion, gameState, legalMovesStore } = chessGame;
    const { board, playerTurn } = boardState;
    const { type: roomType } = gameRoom;
    const boardIsFlipped = currentPlayerColor === 'black';
    const isCurrentPlayerTurn = roomType === 'self' || currentPlayerColor === playerTurn;
    const { status, check: checkedColor } = gameState;
    const isGameOver = status !== 'in-progress';
    const boardInteractionIsDisabled = Boolean(pendingPromotion) || isGameOver || !isCurrentPlayerTurn;

    const {
        drag,
        selectedIndex,
        selectedPiece,
        glowingSquarePropsByIndex,
        getSquareSize,
        clearSelection,
        clearDragStates,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp,
    } = useChessBoardInteractions({
        board,
        playerTurn,
        legalMovesStore,
        checkedColor,
        previousMoveIndices,
        boardInteractionIsDisabled,
        boardIsFlipped,
        movePiece,
        boardRef,
        ghostPieceRef,
    });

    // Memoize board array to render based on flipped state
    const boardToRender = useMemo(() => {
        return boardIsFlipped ? [...board].reverse() : board;
    }, [board, boardIsFlipped]);

    return (
        <GameBoard
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={clearDragStates}
        >
            {boardToRender.map((pieceAlias, visualIndex) => {
                const boardIndex = boardIsFlipped ? NUM_SQUARES - 1 - visualIndex : visualIndex;
                const pieceIsDragged = Boolean(drag && selectedIndex === boardIndex);
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
            {drag && !pendingPromotion && selectedPiece && (
                <GhostPiece
                    ref={ghostPieceRef}
                    squareSize={drag.squareSize}
                    initialX={drag.initialX}
                    initialY={drag.initialY}
                    pieceAlias={selectedPiece.alias}
                />
            )}
            {pendingPromotion && (
                <PawnPromotionPrompt
                    squareSize={getSquareSize()}
                    promotionIndex={pendingPromotion.move.endIndex}
                    color={pendingPromotion.move.piece.color}
                    isFlipped={boardIsFlipped}
                    onDismiss={clearSelection}
                />
            )}
        </GameBoard>
    );
}

export default ChessBoard;
