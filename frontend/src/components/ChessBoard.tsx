import { useMemo, useRef, useState, type PointerEventHandler, type PointerEvent } from 'react';

import {
    getKingIndices,
    getPiece,
    isRowColInBounds,
    NUM_ROWS,
    NUM_COLS,
    NUM_SQUARES,
    rowColToIndex,
    type Move,
    type PieceAlias,
    type RowCol,
} from '@grouchess/chess';

import ChessPiece from './ChessPiece';
import ChessSquare from './ChessSquare';
import GhostPiece from './GhostPiece';
import PawnPromotionPrompt from './PawnPromotionPrompt';

import { useChessGame } from '../providers/ChessGameProvider';
import { useGameRoom } from '../providers/GameRoomProvider';
import { useImages } from '../providers/ImagesProvider';
import { type GlowingSquareProps } from '../utils/types';

export type DragProps = {
    pointerId: number;
    x: number; // pointer X relative to board
    y: number; // pointer Y relative to board
    squareSize: number;
};

function getRowColFromXY(x: number, y: number, squareSize: number, isFlipped: boolean): RowCol {
    const row = Math.floor(y / squareSize);
    const col = Math.floor(x / squareSize);

    return isFlipped ? { row: NUM_ROWS - 1 - row, col: NUM_COLS - 1 - col } : { row, col };
}

function xyFromPointerEvent(
    event: PointerEvent<HTMLDivElement> | PointerEvent<HTMLImageElement>,
    rect: DOMRect
): { x: number; y: number } {
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
    };
}

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
    const { board, playerTurn, previousMoveIndices, movePiece, pendingPromotion, gameStatus, legalMovesStore } =
        useChessGame();
    const { room, currentPlayerColor } = useGameRoom();

    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());
    const boardRef = useRef<HTMLDivElement | null>(null);

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const boardIsFlipped = currentPlayerColor === 'black';
    const isCurrentPlayerTurn = room?.type === 'self' || currentPlayerColor === playerTurn;
    const boardToRender = boardIsFlipped ? [...board].reverse() : board;

    const { status, check: checkedColor } = gameStatus;
    const isGameOver = status !== 'in-progress';
    const boardInteractionIsDisabled = Boolean(pendingPromotion) || isGameOver || !isCurrentPlayerTurn;

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

    function clearSelection() {
        setSelectedIndex(null);
    }

    const createClickHandler = (pieceAliasAtSquare: PieceAlias | undefined, clickedIndex: number) => () => {
        if (boardInteractionIsDisabled) return;

        const isPossibleMoveSquare = clickedIndex in indexToMoveDataForSelectedPiece;
        const pieceAtSquare = pieceAliasAtSquare ? getPiece(pieceAliasAtSquare) : null;
        const isPlayersOwnPiece = pieceAtSquare && pieceAtSquare.color === playerTurn;

        if (isPossibleMoveSquare && selectedPiece) {
            movePiece(indexToMoveDataForSelectedPiece[clickedIndex]);
            clearSelection();
            return;
        }

        if (!pieceAtSquare) {
            clearSelection();
            return;
        }

        // if no selected piece, set current square to selected index
        if (isPlayersOwnPiece) {
            setSelectedIndex(clickedIndex);
        }
    };

    const createImgLoadError = (index: number) => () => {
        setFailedImageIndices((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    };

    return (
        <div
            ref={boardRef}
            className="relative select-none touch-none grid grid-cols-8 rounded-lg overflow-hidden shadow-lg shadow-white/30"
            onPointerMove={(event) => {
                if (boardInteractionIsDisabled || !drag || !boardRef.current) return;
                if (event.pointerId !== drag.pointerId) return;
                const { x, y } = xyFromPointerEvent(event, boardRef.current.getBoundingClientRect());
                setDrag((prevDragData) => (prevDragData ? { ...prevDragData, x, y } : prevDragData));
                const rowCol = getRowColFromXY(x, y, drag.squareSize, boardIsFlipped);
                setDragOverIndex(isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null);
            }}
            onPointerUp={(event) => {
                if (boardInteractionIsDisabled || !drag || event.pointerId !== drag.pointerId) return;

                if (
                    selectedIndex !== null &&
                    dragOverIndex !== null &&
                    dragOverIndex in indexToMoveDataForSelectedPiece
                ) {
                    movePiece(indexToMoveDataForSelectedPiece[dragOverIndex]);
                }
                if (dragOverIndex !== selectedIndex) {
                    clearSelection();
                }
                setDrag(null);
                setDragOverIndex(null);
            }}
            onPointerCancel={() => {
                setDrag(null);
                setDragOverIndex(null);
            }}
        >
            {boardToRender.map((pieceAlias, visualIndex) => {
                const boardIndex = boardIsFlipped ? NUM_SQUARES - 1 - visualIndex : visualIndex;
                let content;
                if (isFinishedLoadingImages && pieceAlias) {
                    const piece = getPiece(pieceAlias);
                    const { color } = piece;
                    const canDrag = color === playerTurn;
                    const onPointerDown: PointerEventHandler<HTMLImageElement> = (event) => {
                        if (boardInteractionIsDisabled || !canDrag || !boardRef.current) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const boardRect = boardRef.current.getBoundingClientRect();
                        const { x, y } = xyFromPointerEvent(event, boardRect);
                        const squareSize = boardRect.width / NUM_COLS;
                        try {
                            boardRef.current.setPointerCapture(event.pointerId);
                        } catch {
                            // ignore errors
                        }
                        setSelectedIndex(boardIndex);
                        setDrag({
                            pointerId: event.pointerId,
                            x,
                            y,
                            squareSize,
                        });
                        const rowCol = getRowColFromXY(x, y, squareSize, boardIsFlipped);
                        setDragOverIndex(isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null);
                    };
                    content = (
                        <ChessPiece
                            piece={piece}
                            showTextDisplay={failedImageIndices.has(boardIndex)}
                            onPointerDown={onPointerDown}
                            onImgLoadError={createImgLoadError(boardIndex)}
                        />
                    );
                }

                return (
                    <ChessSquare
                        key={`square-${visualIndex}`}
                        index={boardIndex}
                        glowingSquareProps={{
                            ...(glowingSquarePropsByIndex[boardIndex] ?? {}),
                            isDraggingOver: Boolean(drag && dragOverIndex === boardIndex),
                        }}
                        hideContent={Boolean(drag && selectedIndex === boardIndex)}
                        onClick={createClickHandler(pieceAlias, boardIndex)}
                        isFlipped={boardIsFlipped}
                    >
                        {content}
                    </ChessSquare>
                );
            })}
            {drag && !pendingPromotion && selectedPiece && (
                <GhostPiece dragProps={drag} pieceAlias={selectedPiece.alias} />
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
