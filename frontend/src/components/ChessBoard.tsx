import { useMemo, useRef, useState, type PointerEventHandler } from 'react';

import ChessSquare from './ChessSquare';
import ChessPiece from './ChessPiece';
import GhostPiece from './GhostPiece';
import { rowColToIndex, NUM_COLS, NUM_ROWS, type GlowingSquare } from '../utils/board';
import { getPiece } from '../utils/pieces';
import type { PieceShortAlias } from '../utils/pieces';
import { computePossibleMovesForPiece } from '../utils/moves';
import { useChessGame } from '../hooks/useChessGame';
import { useImages } from '../providers/ImagesProvider';

export type DragProps = {
    fromIndex: number;
    pointerId: number;
    piece: PieceShortAlias;
    x: number; // pointer X relative to board
    y: number; // pointer Y relative to board
    squareSize: number;
    boardRect: DOMRect;
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
    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const { board, castleMetadata, playerTurn, previousMoveIndices, resetGame, movePiece } = useChessGame();

    const selectedPiece = selectedIndex !== null ? getPiece(board[selectedIndex] as PieceShortAlias) : null;
    const possibleMoveIndicesForSelectedPiece = useMemo(
        () =>
            selectedPiece
                ? computePossibleMovesForPiece(selectedPiece, selectedIndex as number, board, castleMetadata)
                : [],
        [selectedIndex, selectedPiece, board, castleMetadata]
    );

    const glowingSquares = [
        ...previousMoveIndices.map((index) => ({ index, type: 'previous-move' })),
        ...possibleMoveIndicesForSelectedPiece.map((index) => ({ index, type: 'possible-move' })),
    ] as GlowingSquare[];

    function clearSelection() {
        setSelectedIndex(null);
    }

    function handleResetClick() {
        resetGame();
        clearSelection();
    }

    const createClickHandler = (pieceAliasAtSquare: PieceShortAlias | undefined, clickedIndex: number) => () => {
        const isSelectedSquare = clickedIndex === selectedIndex;
        const glowTypesAtSquare = glowingSquares.filter(({ index }) => index === clickedIndex).map(({ type }) => type);
        const isPossibleMoveSquare = glowTypesAtSquare.includes('possible-move');
        const isEmptySquare = pieceAliasAtSquare === undefined;
        const isNotGlowingAndEmpty = !isPossibleMoveSquare && isEmptySquare;

        const pieceAtSquare = pieceAliasAtSquare ? getPiece(pieceAliasAtSquare) : null;
        const isNotPlayersOwnPiece = pieceAtSquare && pieceAtSquare.color !== playerTurn;

        if (isSelectedSquare || isNotGlowingAndEmpty || isNotPlayersOwnPiece) {
            clearSelection();
            return;
        }

        if (isPossibleMoveSquare && selectedPiece) {
            movePiece(selectedIndex as number, clickedIndex);
            clearSelection();
            return;
        }

        if (!pieceAtSquare) {
            clearSelection();
            return;
        }

        // if no selected piece, set current square to selected index
        setSelectedIndex(clickedIndex);
    };

    const createImgLoadError = (index: number) => () => {
        setFailedImageIndices((prev) => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    };

    return (
        <main className="flex flex-col gap-y-8">
            <div
                ref={boardRef}
                className="relative select-none touch-none grid grid-cols-8 rounded-lg overflow-hidden shadow-lg shadow-white/30"
                onPointerMove={(event) => {
                    if (!drag || !boardRef.current) return;
                    if (event.pointerId !== drag.pointerId) return;
                    const rect = drag.boardRect;
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    setDrag((prevDragData) => (prevDragData ? { ...prevDragData, x, y } : prevDragData));
                    const col = Math.floor(x / drag.squareSize);
                    const row = Math.floor(y / drag.squareSize);
                    if (row < 0 || row >= NUM_ROWS || col < 0 || col >= NUM_COLS) {
                        setDragOverIndex(null);
                    } else {
                        setDragOverIndex(rowColToIndex({ row, col }));
                    }
                }}
                onPointerUp={(event) => {
                    if (!drag || event.pointerId !== drag.pointerId) return;

                    if (
                        selectedIndex !== null &&
                        dragOverIndex !== null &&
                        possibleMoveIndicesForSelectedPiece.includes(dragOverIndex)
                    ) {
                        movePiece(selectedIndex, dragOverIndex);
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
                {board.map((piece, index) => {
                    const glowTypesForSquare = glowingSquares
                        .filter(({ index: glowingIndex }) => glowingIndex === index)
                        .map(({ type }) => type);
                    const isSelected = index === selectedIndex;

                    let content;
                    if (isFinishedLoadingImages && piece) {
                        const { shortAlias, color } = getPiece(piece);
                        const canDrag = color === playerTurn;
                        const onPointerDown: PointerEventHandler<HTMLImageElement> = (event) => {
                            if (!canDrag || !boardRef.current) return;
                            event.preventDefault();
                            event.stopPropagation();
                            const rect = boardRef.current.getBoundingClientRect();
                            const squareSize = rect.width / NUM_COLS;
                            const x = event.clientX - rect.left;
                            const y = event.clientY - rect.top;
                            try {
                                boardRef.current.setPointerCapture(event.pointerId);
                            } catch {
                                // ignore errors
                            }
                            setSelectedIndex(index);
                            setDrag({
                                fromIndex: index,
                                pointerId: event.pointerId,
                                piece: shortAlias,
                                x,
                                y,
                                squareSize,
                                boardRect: rect,
                            });
                            // Initialize hover index immediately
                            const initCol = Math.floor(x / squareSize);
                            const initRow = Math.floor(y / squareSize);
                            if (initRow >= 0 && initRow < NUM_ROWS && initCol >= 0 && initCol < NUM_COLS) {
                                setDragOverIndex(rowColToIndex({ row: initRow, col: initCol }));
                            } else {
                                setDragOverIndex(null);
                            }
                        };
                        content = (
                            <ChessPiece
                                piece={getPiece(piece)}
                                showTextDisplay={failedImageIndices.has(index)}
                                onPointerDown={onPointerDown}
                                onImgLoadError={createImgLoadError(index)}
                            />
                        );
                    }

                    return (
                        <ChessSquare
                            key={`square-${index}`}
                            index={index}
                            glowTypes={glowTypesForSquare}
                            isSelected={isSelected}
                            isDraggingOver={Boolean(drag && dragOverIndex === index)}
                            hideContent={Boolean(drag && drag.fromIndex === index)}
                            onClick={createClickHandler(piece, index)}
                        >
                            {content}
                        </ChessSquare>
                    );
                })}
                {drag && <GhostPiece dragProps={drag} />}
            </div>

            <section>
                <button className="cursor-pointer border p-2 border-white text-white" onClick={handleResetClick}>
                    RESET
                </button>
            </section>
        </main>
    );
}

export default ChessBoard;
