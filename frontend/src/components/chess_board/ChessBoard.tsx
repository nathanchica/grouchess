import { useCallback, useMemo, useRef, useState, type PointerEvent, type PointerEventHandler } from 'react';

import { getKingIndices, getPiece, isRowColInBounds, rowColToIndex } from '@grouchess/chess';
import { NUM_COLS, NUM_SQUARES, type BoardIndex, type Move, type PieceAlias } from '@grouchess/models';

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
    x: number; // pointer X relative to board
    y: number; // pointer Y relative to board
    squareSize: number;
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

    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [drag, setDrag] = useState<DragProps | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);

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

    const handleSquareClick = useCallback(
        (boardIndex: BoardIndex) => {
            if (boardInteractionIsDisabled) return;

            const pieceAliasAtSquare = board[boardIndex];
            const isPossibleMoveSquare = boardIndex in indexToMoveDataForSelectedPiece;
            const pieceAtSquare = pieceAliasAtSquare ? getPiece(pieceAliasAtSquare) : null;
            const isPlayersOwnPiece = pieceAtSquare && pieceAtSquare.color === playerTurn;

            if (isPossibleMoveSquare && selectedPiece) {
                movePiece(indexToMoveDataForSelectedPiece[boardIndex]);
                clearSelection();
                return;
            }

            if (!pieceAtSquare) {
                clearSelection();
                return;
            }

            // if no selected piece, set current square to selected index
            if (isPlayersOwnPiece) {
                setSelectedIndex(boardIndex);
            }
        },
        [board, boardInteractionIsDisabled, indexToMoveDataForSelectedPiece, movePiece, playerTurn, selectedPiece]
    );

    // Memoize click handlers for each square to avoid re-renders
    const squareClickHandlersByIndex = useMemo(() => {
        const handlers: Record<number, () => void> = {};
        for (let index = 0; index < NUM_SQUARES; index++) {
            handlers[index] = () => handleSquareClick(index);
        }
        return handlers;
    }, [handleSquareClick]);

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

    const handlePiecePointerDown = useCallback(
        (boardIndex: BoardIndex, event: PointerEvent<HTMLImageElement>) => {
            const pieceAlias = board[boardIndex];
            if (!pieceAlias) return;

            const piece = getPiece(pieceAlias);
            const canDrag = piece.color === playerTurn;

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
        },
        [board, boardInteractionIsDisabled, boardIsFlipped, playerTurn]
    );

    // Memoize pointer down handlers for each square to avoid re-renders
    const piecePointerDownHandlersByIndex = useMemo(() => {
        const handlers: Record<number, PointerEventHandler<HTMLImageElement>> = {};
        for (let index = 0; index < NUM_SQUARES; index++) {
            handlers[index] = (event) => handlePiecePointerDown(index, event);
        }
        return handlers;
    }, [handlePiecePointerDown]);

    // Memoize image error handlers for each square to avoid re-renders
    const imgLoadErrorHandlersByIndex = useMemo(() => {
        const handlers: Record<number, () => void> = {};
        for (let index = 0; index < NUM_SQUARES; index++) {
            handlers[index] = () => {
                setFailedImageIndices((prev) => {
                    const next = new Set(prev);
                    next.add(index);
                    return next;
                });
            };
        }
        return handlers;
    }, []);

    return (
        <div
            ref={boardRef}
            className="relative select-none touch-none grid grid-cols-8 rounded-lg overflow-hidden shadow-2xl shadow-white/25"
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
                    content = (
                        <ChessPiece
                            piece={piece}
                            showTextDisplay={failedImageIndices.has(boardIndex)}
                            onPointerDown={piecePointerDownHandlersByIndex[boardIndex]}
                            onImgLoadError={imgLoadErrorHandlersByIndex[boardIndex]}
                        />
                    );
                }

                return (
                    <ChessSquare
                        key={`square-${visualIndex}`}
                        index={boardIndex}
                        glowingSquareProps={glowingSquarePropsWithDragByIndex[boardIndex]}
                        hideContent={Boolean(drag && selectedIndex === boardIndex)}
                        onClick={squareClickHandlersByIndex[boardIndex]}
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
