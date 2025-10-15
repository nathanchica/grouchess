import { useMemo, useRef, useState, useEffect, type PointerEventHandler } from 'react';

import ChessSquare from './ChessSquare';
import ChessPiece from './ChessPiece';
import GhostPiece from './GhostPiece';
import {
    rowColToIndex,
    isRowColInBounds,
    getKingIndices,
    NUM_COLS,
    groupGlowingSquaresByIndex,
    type GlowingSquare,
    type RowCol,
} from '../utils/board';
import { getPiece, getColorFromAlias } from '../utils/pieces';
import type { Piece, PieceShortAlias } from '../utils/pieces';
import { computePossibleMovesForIndex, isSquareAttacked } from '../utils/moves';
import { useChessGame } from '../providers/ChessGameProvider';
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

function getRowColFromXY(x: number, y: number, squareSize: number): RowCol {
    return {
        row: Math.floor(y / squareSize),
        col: Math.floor(x / squareSize),
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
    const { board, castleMetadata, playerTurn, previousMoveIndices, movePiece, timelineVersion } = useChessGame();

    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());
    const boardRef = useRef<HTMLDivElement | null>(null);

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    function clearSelection() {
        setSelectedIndex(null);
    }

    function resetInteractionStates() {
        setDragOverIndex(null);
        setDrag(null);
        clearSelection();
    }

    // Clear transient UI state whenever the game timeline resets or jumps
    useEffect(() => {
        if (drag && boardRef.current) {
            try {
                boardRef.current.releasePointerCapture(drag.pointerId);
            } catch {
                // ignore errors
            }
        }
        resetInteractionStates(); // eslint-disable-line react-hooks/set-state-in-effect
    }, [timelineVersion]); // eslint-disable-line react-hooks/exhaustive-deps

    // Memoize derived values to only recompute when selectedIndex and the other deps changes
    const { selectedPiece, possibleMoveIndicesForSelectedPiece, glowingSquaresByIndex } = useMemo(() => {
        const previousMoves: GlowingSquare[] = previousMoveIndices.map((index) => ({
            index,
            type: 'previous-move' as const,
        }));
        const { white: whiteKingIndex, black: blackKingIndex } = getKingIndices(board);
        const kingChecks: GlowingSquare[] = [
            ...(isSquareAttacked(board, blackKingIndex, 'white')
                ? [{ index: blackKingIndex, type: 'check' as const }]
                : []),
            ...(isSquareAttacked(board, whiteKingIndex, 'black')
                ? [{ index: whiteKingIndex, type: 'check' as const }]
                : []),
        ];
        let glowingSquares: GlowingSquare[] = [...previousMoves, ...kingChecks];

        if (selectedIndex === null) {
            return {
                selectedPiece: null,
                possibleMoveIndicesForSelectedPiece: [] as number[],
                glowingSquaresByIndex: groupGlowingSquaresByIndex(glowingSquares),
            };
        }

        const selectedPiece = getPiece(board[selectedIndex] as PieceShortAlias);
        const possibleMoveIndicesForSelectedPiece = computePossibleMovesForIndex(selectedIndex, board, castleMetadata);
        glowingSquares = [
            ...glowingSquares,
            ...possibleMoveIndicesForSelectedPiece.map((index) => {
                const pieceAliasAtIndex = board[index];
                return {
                    index,
                    type:
                        pieceAliasAtIndex && getColorFromAlias(pieceAliasAtIndex) !== (selectedPiece as Piece).color
                            ? ('possible-capture' as const)
                            : ('possible-move' as const),
                };
            }),
        ];

        return {
            selectedPiece,
            possibleMoveIndicesForSelectedPiece,
            glowingSquaresByIndex: groupGlowingSquaresByIndex(glowingSquares),
        };
    }, [selectedIndex, board, castleMetadata, previousMoveIndices]);

    const createClickHandler = (pieceAliasAtSquare: PieceShortAlias | undefined, clickedIndex: number) => () => {
        const isPossibleMoveSquare = possibleMoveIndicesForSelectedPiece.includes(clickedIndex);
        const pieceAtSquare = pieceAliasAtSquare ? getPiece(pieceAliasAtSquare) : null;
        const isPlayersOwnPiece = pieceAtSquare && pieceAtSquare.color === playerTurn;

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
                if (!drag || !boardRef.current) return;
                if (event.pointerId !== drag.pointerId) return;
                const rect = drag.boardRect;
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                setDrag((prevDragData) => (prevDragData ? { ...prevDragData, x, y } : prevDragData));
                const rowCol = getRowColFromXY(x, y, drag.squareSize);
                setDragOverIndex(isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null);
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
            {board.map((pieceAlias, index) => {
                const glowingSquares = glowingSquaresByIndex[index] ?? [];
                const glowTypesForSquare = glowingSquares.map(({ type }) => type);
                const isSelected = index === selectedIndex;

                let content;
                if (isFinishedLoadingImages && pieceAlias) {
                    const { shortAlias, color } = getPiece(pieceAlias);
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
                        const rowCol = getRowColFromXY(x, y, squareSize);
                        setDragOverIndex(isRowColInBounds(rowCol) ? rowColToIndex(rowCol) : null);
                    };
                    content = (
                        <ChessPiece
                            piece={getPiece(pieceAlias)}
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
                        onClick={createClickHandler(pieceAlias, index)}
                    >
                        {content}
                    </ChessSquare>
                );
            })}
            {drag && <GhostPiece dragProps={drag} />}
        </div>
    );
}

export default ChessBoard;
