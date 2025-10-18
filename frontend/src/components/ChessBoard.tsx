import { useMemo, useRef, useState, type PointerEventHandler } from 'react';

import ChessPiece from './ChessPiece';
import ChessSquare from './ChessSquare';
import GhostPiece from './GhostPiece';
import PawnPromotionPrompt from './PawnPromotionPrompt';

import { useChessGame } from '../providers/ChessGameProvider';
import { useImages } from '../providers/ImagesProvider';
import {
    rowColToIndex,
    isRowColInBounds,
    getKingIndices,
    NUM_COLS,
    type RowCol,
    type GlowingSquareProps,
} from '../utils/board';
import { computePossibleMovesForIndex, isSquareAttacked, type Move } from '../utils/moves';
import { getPiece, type Piece, type PieceShortAlias } from '../utils/pieces';

export type DragProps = {
    fromIndex: number;
    pointerId: number;
    piece: Piece;
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
    const { board, castleRightsByColor, playerTurn, previousMoveIndices, movePiece, pendingPromotion, gameStatus } =
        useChessGame();

    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());
    const boardRef = useRef<HTMLDivElement | null>(null);

    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    function clearSelection() {
        setSelectedIndex(null);
    }

    const isGameOver = gameStatus.status !== 'in-progress';
    const boardInteractionIsDisabled = Boolean(pendingPromotion) || isGameOver;

    // Memoize derived values to only recompute when selectedIndex and the other deps changes
    const { selectedPiece, indexToMoveDataForSelectedPiece, glowingSquarePropsByIndex } = useMemo(() => {
        let glowingSquarePropsByIndex: Record<number, GlowingSquareProps> = {};
        previousMoveIndices.forEach((index) => {
            glowingSquarePropsByIndex[index] = { isPreviousMove: true };
        });

        const { white: whiteKingIndex, black: blackKingIndex } = getKingIndices(board);
        if (isSquareAttacked(board, blackKingIndex, 'white')) {
            glowingSquarePropsByIndex[blackKingIndex] ??= {};
            glowingSquarePropsByIndex[blackKingIndex].isCheck = true;
        }
        if (isSquareAttacked(board, whiteKingIndex, 'black')) {
            glowingSquarePropsByIndex[whiteKingIndex] ??= {};
            glowingSquarePropsByIndex[whiteKingIndex].isCheck = true;
        }

        if (selectedIndex === null) {
            return {
                selectedPiece: null,
                indexToMoveDataForSelectedPiece: {} as Record<number, Move>,
                glowingSquarePropsByIndex,
            };
        }

        const selectedPiece = getPiece(board[selectedIndex] as PieceShortAlias);
        const possibleMovesForSelectedPiece = computePossibleMovesForIndex(
            selectedIndex,
            board,
            castleRightsByColor,
            previousMoveIndices
        );
        possibleMovesForSelectedPiece.forEach(({ endIndex, type }) => {
            glowingSquarePropsByIndex[endIndex] ??= {};
            glowingSquarePropsByIndex[endIndex] = {
                ...glowingSquarePropsByIndex[endIndex],
                // computePossibleMovesForIndex has determined that the piece at index, if existing, is an enemy piece
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
            selectedPiece,
            indexToMoveDataForSelectedPiece,
            glowingSquarePropsByIndex,
        };
    }, [selectedIndex, board, castleRightsByColor, previousMoveIndices]);

    const createClickHandler = (pieceAliasAtSquare: PieceShortAlias | undefined, clickedIndex: number) => () => {
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
                const rect = drag.boardRect;
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;
                setDrag((prevDragData) => (prevDragData ? { ...prevDragData, x, y } : prevDragData));
                const rowCol = getRowColFromXY(x, y, drag.squareSize);
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
            {board.map((pieceAlias, index) => {
                let content;
                if (isFinishedLoadingImages && pieceAlias) {
                    const piece = getPiece(pieceAlias);
                    const { color } = piece;
                    const canDrag = color === playerTurn;
                    const onPointerDown: PointerEventHandler<HTMLImageElement> = (event) => {
                        if (boardInteractionIsDisabled || !canDrag || !boardRef.current) return;
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
                            piece,
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
                            piece={piece}
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
                        glowingSquareProps={{
                            ...(glowingSquarePropsByIndex[index] ?? {}),
                            isDraggingOver: Boolean(drag && dragOverIndex === index),
                        }}
                        hideContent={Boolean(drag && drag.fromIndex === index)}
                        onClick={createClickHandler(pieceAlias, index)}
                    >
                        {content}
                    </ChessSquare>
                );
            })}
            {drag && !pendingPromotion && <GhostPiece dragProps={drag} />}
            {pendingPromotion && boardRef.current && (
                <PawnPromotionPrompt
                    boardRect={boardRef.current.getBoundingClientRect()}
                    promotionIndex={pendingPromotion.move.endIndex}
                    color={pendingPromotion.move.piece.color}
                    onDismiss={clearSelection}
                />
            )}
        </div>
    );
}

export default ChessBoard;
