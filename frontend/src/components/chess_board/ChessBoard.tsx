import { useMemo, useRef, useState } from 'react';

import { getKingIndices, getPiece, isRowColInBounds, rowColToIndex } from '@grouchess/chess';
import { NUM_COLS, NUM_SQUARES, type Move, type PieceAlias } from '@grouchess/models';

import ChessPiece from './ChessPiece';
import GhostPiece from './GhostPiece';
import PawnPromotionPrompt from './PawnPromotionPrompt';
import ChessSquare from './chess_square/ChessSquare';

import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useImages } from '../../providers/ImagesProvider';
import { getRowColFromXY, xyFromPointerEvent } from '../../utils/board';
import { type GlowingSquareProps } from '../../utils/types';

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

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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

    // Memoize board array to render based on flipped state
    const boardToRender = useMemo(() => {
        return boardIsFlipped ? [...board].reverse() : board;
    }, [board, boardIsFlipped]);

    // Memoize derived values to only recompute when selectedIndex and the other deps changes
    const { selectedPiece, indexToMoveDataForSelectedPiece, glowingSquarePropsByIndex } = useMemo(() => {
        let glowingSquarePropsByIndex: Record<number, GlowingSquareProps> = {};
        previousMoveIndices.forEach((index) => {
            glowingSquarePropsByIndex[index] = { isPreviousMove: true };
        });

        if (checkedColor !== undefined) {
            const kingIndex = getKingIndices(board)[checkedColor];
            glowingSquarePropsByIndex[kingIndex] ??= {};
            glowingSquarePropsByIndex[kingIndex].isCheck = true;
        }

        if (selectedIndex === null) {
            return {
                selectedPiece: null,
                indexToMoveDataForSelectedPiece: {} as Record<number, Move>,
                glowingSquarePropsByIndex,
            };
        }

        const possibleMovesForSelectedPiece = legalMovesStore.byStartIndex[selectedIndex] ?? [];
        possibleMovesForSelectedPiece.forEach(({ endIndex, type }) => {
            glowingSquarePropsByIndex[endIndex] ??= {};
            glowingSquarePropsByIndex[endIndex] = {
                ...glowingSquarePropsByIndex[endIndex],
                ...(type === 'capture' ? { canCapture: true } : { canMove: true }),
            };
        });

        glowingSquarePropsByIndex[selectedIndex] ??= {};
        glowingSquarePropsByIndex[selectedIndex].isSelected = true;

        const indexToMoveDataForSelectedPiece: Record<number, Move> = {};
        possibleMovesForSelectedPiece.forEach((move) => {
            indexToMoveDataForSelectedPiece[move.endIndex] = move;
        });

        return {
            selectedPiece: getPiece(board[selectedIndex] as PieceAlias),
            indexToMoveDataForSelectedPiece,
            glowingSquarePropsByIndex,
        };
    }, [selectedIndex, board, previousMoveIndices, checkedColor, legalMovesStore]);

    const clearSelection = () => {
        setSelectedIndex(null);
    };

    const clearDrag = () => {
        setDrag(null);
        setDragOverIndex(null);
    };

    // Memoize glowing square props for each square to avoid re-renders
    const glowingSquarePropsWithDragByIndex = useMemo(() => {
        const propsMap: Record<number, GlowingSquareProps> = {};
        for (let index = 0; index < NUM_SQUARES; index++) {
            propsMap[index] = {
                ...(glowingSquarePropsByIndex[index] ?? {}),
                isDraggingOver: Boolean(drag && dragOverIndex === index),
            };
        }
        return propsMap;
    }, [glowingSquarePropsByIndex, drag, dragOverIndex]);

    return (
        <div
            ref={boardRef}
            role="grid"
            className="relative select-none touch-none grid grid-cols-8 rounded-lg overflow-hidden shadow-2xl shadow-white/25"
            onPointerDown={(event) => {
                if (boardInteractionIsDisabled || !boardRef.current) return;

                const boardRect = boardRef.current.getBoundingClientRect();
                const { x, y } = xyFromPointerEvent(event, boardRect);
                const squareSize = boardRect.width / NUM_COLS;
                const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);

                if (!isRowColInBounds(rowCol)) return;

                const boardIndex = rowColToIndex(rowCol);
                const pieceAlias = board[boardIndex];
                const isPossibleMoveSquare = boardIndex in indexToMoveDataForSelectedPiece;

                // If clicking on a possible move square while a piece is selected, execute the move
                if (selectedPiece && isPossibleMoveSquare) {
                    movePiece(indexToMoveDataForSelectedPiece[boardIndex]);
                    clearSelection();
                    return;
                }

                // If clicking on own piece, select it and prepare for potential drag
                if (pieceAlias) {
                    const piece = getPiece(pieceAlias);
                    if (piece.color === playerTurn) {
                        event.preventDefault();
                        event.stopPropagation();

                        try {
                            boardRef.current.setPointerCapture(event.pointerId);
                        } catch {
                            // ignore errors
                        }

                        setSelectedIndex(boardIndex);
                        setDrag({
                            pointerId: event.pointerId,
                            squareSize,
                            boardRect,
                            initialX: x,
                            initialY: y,
                        });
                        setDragOverIndex(boardIndex);
                        return;
                    }
                    // If clicking on opponent piece (non-capture), do nothing
                    return;
                }

                // If clicking on empty square (not a possible move square), clear selection
                clearSelection();
            }}
            onPointerMove={(event) => {
                if (boardInteractionIsDisabled || !drag || !ghostPieceRef.current) return;
                if (event.pointerId !== drag.pointerId) return;
                const { x, y } = xyFromPointerEvent(event, drag.boardRect);

                // Update ghost position directly without re-render
                const offsetX = -drag.squareSize / 2;
                const offsetY = -drag.squareSize / 2;
                ghostPieceRef.current.style.transform = `translate(${x + offsetX}px, ${y + offsetY}px)`;

                // Only update state when hovering over a different square
                const rowCol = getRowColFromXY(x, y, drag.squareSize, boardIsFlipped);
                const newDragOverIndex = isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null;
                if (newDragOverIndex !== dragOverIndex) {
                    setDragOverIndex(newDragOverIndex);
                }
            }}
            onPointerUp={(event) => {
                if (!drag || event.pointerId !== drag.pointerId || selectedIndex === null) return;

                const endIndex = dragOverIndex ?? selectedIndex;

                // Only handle drag behavior (when pointer moved to different square)
                if (endIndex === selectedIndex) {
                    clearDrag();
                    return;
                }

                // We dragged to a legal move square
                if (endIndex in indexToMoveDataForSelectedPiece) {
                    movePiece(indexToMoveDataForSelectedPiece[endIndex]);
                }

                clearSelection();
                clearDrag();
            }}
            onPointerCancel={clearDrag}
        >
            {boardToRender.map((pieceAlias, visualIndex) => {
                const boardIndex = boardIsFlipped ? NUM_SQUARES - 1 - visualIndex : visualIndex;
                return (
                    <ChessSquare
                        key={`square-${visualIndex}`}
                        index={boardIndex}
                        glowingSquareProps={glowingSquarePropsWithDragByIndex[boardIndex]}
                        hideContent={Boolean(drag && selectedIndex === boardIndex)}
                        isFlipped={boardIsFlipped}
                    >
                        {isFinishedLoadingImages && pieceAlias ? <ChessPiece piece={getPiece(pieceAlias)} /> : null}
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
            {pendingPromotion && boardRef.current && (
                <PawnPromotionPrompt
                    boardRect={boardRef.current.getBoundingClientRect()}
                    promotionIndex={pendingPromotion.move.endIndex}
                    color={pendingPromotion.move.piece.color}
                    isFlipped={boardIsFlipped}
                    onDismiss={clearSelection}
                />
            )}
        </div>
    );
}

export default ChessBoard;
