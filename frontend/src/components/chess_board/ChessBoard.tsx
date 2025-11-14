import { useEffect, useMemo, useRef, useState } from 'react';

import ChessBoardSquares from './ChessBoardSquares';
import GhostPiece from './GhostPiece';
import PawnPromotionPrompt from './PawnPromotionPrompt';
import { getSquareSizeFromBoardRect } from './utils/board';
import {
    createPointerDownEventHandler,
    createPointerMoveEventHandler,
    createPointerUpEventHandler,
} from './utils/interactions';

import { useChessBoard } from '../../hooks/useChessBoard';
import { useChessBoardInteractions } from '../../hooks/useChessBoardInteractions';
import { addEventListener, removeEventListener } from '../../utils/window';
import GameBoard from '../common/GameBoard';

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
    const {
        board,
        playerTurn,
        previousMoveIndices,
        legalMovesStore,
        boardIsFlipped,
        boardInteractionIsDisabled,
        pendingPromotion,
        checkedColor,
        movePiece,
    } = useChessBoard();

    const [boardRect, setBoardRect] = useState<DOMRect>(new DOMRect());

    const boardRef = useRef<HTMLDivElement | null>(null);
    const ghostPieceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateBoardRect = () => {
            /* v8 ignore else -- @preserve */
            if (boardRef.current) {
                setBoardRect(boardRef.current.getBoundingClientRect());
            }
        };

        const scrollListenerOptions: AddEventListenerOptions = {
            passive: true,
        };

        updateBoardRect();

        addEventListener('resize', updateBoardRect);
        addEventListener('scroll', updateBoardRect, scrollListenerOptions);

        return () => {
            removeEventListener('resize', updateBoardRect);
            removeEventListener('scroll', updateBoardRect, scrollListenerOptions);
        };
    }, []);

    const {
        drag,
        dragOverIndex,
        selectedIndex,
        selectedPiece,
        legalMovesForSelectedPieceByEndIndex,
        clearSelection,
        clearDragStates,
        selectIndex,
        startDrag,
        updateDragOverIndex,
    } = useChessBoardInteractions({
        board,
        boardRef,
        legalMovesStore,
    });

    // Create pointer event handlers using the creator functions
    const handlePointerDown = useMemo(
        () =>
            createPointerDownEventHandler(
                boardRect,
                boardInteractionIsDisabled,
                boardIsFlipped,
                board,
                playerTurn,
                selectedPiece,
                legalMovesForSelectedPieceByEndIndex,
                movePiece,
                clearSelection,
                selectIndex,
                startDrag
            ),
        [
            boardRect,
            boardInteractionIsDisabled,
            boardIsFlipped,
            board,
            playerTurn,
            selectedPiece,
            legalMovesForSelectedPieceByEndIndex,
            movePiece,
            clearSelection,
            selectIndex,
            startDrag,
        ]
    );

    const handlePointerMove = useMemo(
        () =>
            createPointerMoveEventHandler(
                ghostPieceRef, // eslint-disable-line react-hooks/refs
                boardInteractionIsDisabled,
                boardIsFlipped,
                drag,
                dragOverIndex,
                updateDragOverIndex
            ),
        [ghostPieceRef, boardInteractionIsDisabled, boardIsFlipped, drag, dragOverIndex, updateDragOverIndex]
    );

    const handlePointerUp = useMemo(
        () =>
            createPointerUpEventHandler(
                drag,
                dragOverIndex,
                selectedIndex,
                legalMovesForSelectedPieceByEndIndex,
                movePiece,
                clearSelection,
                clearDragStates
            ),
        [
            drag,
            dragOverIndex,
            selectedIndex,
            legalMovesForSelectedPieceByEndIndex,
            movePiece,
            clearSelection,
            clearDragStates,
        ]
    );

    return (
        <GameBoard
            ref={boardRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={clearDragStates}
        >
            <ChessBoardSquares
                board={board}
                boardIsFlipped={boardIsFlipped}
                pieceBeingDraggedIndex={drag ? selectedIndex : null}
                dragOverIndex={dragOverIndex}
                previousMoveIndices={previousMoveIndices}
                checkedColor={checkedColor}
                selectedIndex={selectedIndex}
                legalMovesForSelectedPieceByEndIndex={legalMovesForSelectedPieceByEndIndex}
            />
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
                    squareSize={getSquareSizeFromBoardRect(boardRect)}
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
