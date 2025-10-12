import { useState } from 'react';
import { getPiece, aliasToPieceData } from '../utils/pieces';
import type { PieceShortAlias, PieceColor, ChessBoardType } from '../utils/pieces';

type RowCol = { row: number; col: number };
type GlowingSquare = {
    type: 'last-move' | 'possible-move' | 'check';
    index: number;
};

const NUM_SQUARES = 64;
const CHESS_SQUARE_BASE_CLASSES =
    'relative h-20 cursor-pointer flex items-center justify-center transition-colors border-r border-b border-blue-900';

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

function indexToRowCol(index: number): RowCol {
    return {
        row: Math.floor(index / 8),
        col: index % 8,
    };
}

function rowColToIndex({ row, col }: RowCol): number {
    return row * 8 + col;
}

function ChessBoard() {
    const [board, setBoard] = useState<ChessBoardType>(createInitialBoard);
    const [glowingSquares, setGlowingSquares] = useState<GlowingSquare[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [playerTurn, setPlayerTurn] = useState<PieceColor>('white');
    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());

    const glowingIndices = glowingSquares.map(({ index }) => index);
    const selectedPiece = selectedIndex ? getPiece(board[selectedIndex] as PieceShortAlias) : null;

    function handleResetClick() {
        setBoard(createInitialBoard);
        setSelectedIndex(null);
        setGlowingSquares([]);
        setPlayerTurn('white');
    }

    function clearSelection() {
        setSelectedIndex(null);
        setGlowingSquares((prevGlowingSquares) => {
            return prevGlowingSquares.filter(({ type }) => type === 'last-move');
        });
    }

    function movePiece(pieceAlias: PieceShortAlias, prevIndex: number, nextIndex: number) {
        setBoard((prevBoard) => {
            const nextBoard = [...prevBoard];
            nextBoard[prevIndex] = undefined;
            nextBoard[nextIndex] = pieceAlias;
            return nextBoard;
        });
        setSelectedIndex(null);
        setGlowingSquares([
            {
                index: prevIndex,
                type: 'last-move',
            },
            {
                index: nextIndex,
                type: 'last-move',
            },
        ]);
        setPlayerTurn((prevTurn) => (prevTurn === 'white' ? 'black' : 'white'));
    }

    const createClickHandler = (pieceAlias: PieceShortAlias | undefined, clickedIndex: number) => () => {
        const isSelectedSquare = clickedIndex === selectedIndex;
        const isGlowing = glowingIndices.includes(clickedIndex);
        const isEmptySquare = board[clickedIndex] === undefined;
        const isNotGlowingAndEmpty = !isGlowing && isEmptySquare;

        const currPiece = pieceAlias ? getPiece(pieceAlias) : null;
        const isNotPlayersOwnPiece = currPiece && currPiece.color !== playerTurn;

        if (isSelectedSquare || isNotGlowingAndEmpty || isNotPlayersOwnPiece) {
            clearSelection();
            return;
        }

        if (isGlowing && selectedPiece) {
            movePiece(selectedPiece.shortAlias, selectedIndex as number, clickedIndex);
            return;
        }

        if (!currPiece) {
            clearSelection();
            return;
        }

        // if no selected piece, set current square to selected index and set glowing indices to possible moves for the selected piece
        setSelectedIndex(clickedIndex);

        const { row, col } = indexToRowCol(clickedIndex);

        let nextGlowingSquares: GlowingSquare[] = [];
        if (pieceAlias === 'P') {
            for (const currRow of [row - 1, row - 2]) {
                if (currRow < 0) continue;
                const index = rowColToIndex({ row: currRow, col });
                if (board[index] === undefined) {
                    nextGlowingSquares.push({
                        index,
                        type: 'possible-move',
                    });
                } else {
                    break;
                }
            }
        } else if (pieceAlias === 'p') {
            for (const currRow of [row + 1, row + 2]) {
                if (currRow >= 8) continue;
                const index = rowColToIndex({ row: currRow, col });
                if (board[index] === undefined) {
                    nextGlowingSquares.push({
                        index,
                        type: 'possible-move',
                    });
                } else {
                    break;
                }
            }
        } else if (pieceAlias === 'B') {
            const directions = [
                // down-right
                [
                    rowColToIndex({ row: row + 1, col: col + 1 }),
                    rowColToIndex({ row: row + 2, col: col + 2 }),
                    rowColToIndex({ row: row + 3, col: col + 3 }),
                    rowColToIndex({ row: row + 4, col: col + 4 }),
                    rowColToIndex({ row: row + 5, col: col + 5 }),
                    rowColToIndex({ row: row + 6, col: col + 6 }),
                    rowColToIndex({ row: row + 7, col: col + 7 }),
                ],
                // down-left
                [
                    rowColToIndex({ row: row + 1, col: col - 1 }),
                    rowColToIndex({ row: row + 2, col: col - 2 }),
                    rowColToIndex({ row: row + 3, col: col - 3 }),
                    rowColToIndex({ row: row + 4, col: col - 4 }),
                    rowColToIndex({ row: row + 5, col: col - 5 }),
                    rowColToIndex({ row: row + 6, col: col - 6 }),
                    rowColToIndex({ row: row + 7, col: col - 7 }),
                ],
                // up-left
                [
                    rowColToIndex({ row: row - 1, col: col - 1 }),
                    rowColToIndex({ row: row - 2, col: col - 2 }),
                    rowColToIndex({ row: row - 3, col: col - 3 }),
                    rowColToIndex({ row: row - 4, col: col - 4 }),
                    rowColToIndex({ row: row - 5, col: col - 5 }),
                    rowColToIndex({ row: row - 6, col: col - 6 }),
                    rowColToIndex({ row: row - 7, col: col - 7 }),
                ],
                // up-right
                [
                    rowColToIndex({ row: row - 1, col: col + 1 }),
                    rowColToIndex({ row: row - 2, col: col + 2 }),
                    rowColToIndex({ row: row - 3, col: col + 3 }),
                    rowColToIndex({ row: row - 4, col: col + 4 }),
                    rowColToIndex({ row: row - 5, col: col + 5 }),
                    rowColToIndex({ row: row - 6, col: col + 6 }),
                    rowColToIndex({ row: row - 7, col: col + 7 }),
                ],
            ];
            for (const direction of directions) {
                for (const index of direction) {
                    if (index < 0 || index >= NUM_SQUARES) continue;
                    if (board[index] === undefined) {
                        nextGlowingSquares.push({
                            index,
                            type: 'possible-move',
                        });
                    } else {
                        break;
                    }
                }
            }
        }

        setGlowingSquares((prevGlowingSquares) => {
            const lastMoveSquares = prevGlowingSquares.filter(({ type }) => type === 'last-move');
            return [...lastMoveSquares, ...nextGlowingSquares];
        });
    };

    return (
        <main className="flex flex-col gap-y-8">
            <div className="grid grid-cols-8 border-t border-l border-blue-900">
                {board.map((piece, index) => {
                    const { row, col } = indexToRowCol(index);
                    const isDarkSquare = row % 2 === (col % 2 === 0 ? 1 : 0);
                    const glowMatch = glowingSquares.find(({ index: glowingIndex }) => glowingIndex === index);
                    const glowType = glowMatch?.type;
                    const isGlowing = Boolean(glowType);
                    const isSelected = index === selectedIndex;

                    let backgroundClasses = isDarkSquare ? 'bg-slate-700 text-white' : 'bg-stone-50';
                    let highlightClasses = '';
                    let hoverClasses = '';
                    if (isSelected) {
                        backgroundClasses = isDarkSquare ? 'bg-emerald-600 text-white' : 'bg-emerald-200';
                        highlightClasses = '';
                    } else if (isGlowing) {
                        if (glowType === 'last-move') {
                            backgroundClasses = isDarkSquare ? 'bg-purple-300' : 'bg-purple-200';
                            highlightClasses = '';
                            hoverClasses = '';
                        } else if (glowType === 'possible-move') {
                            const dotContrast = isDarkSquare
                                ? 'after:bg-lime-200/90 after:ring-2 after:ring-lime-50/80'
                                : 'after:bg-emerald-300/80 after:ring-2 after:ring-emerald-500/40';
                            highlightClasses = `after:absolute after:left-1/2 after:top-1/2 after:h-6 after:w-6 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${dotContrast} after:content-[""] hover:after:opacity-0`;
                            // On hover, softly recolor the square to match the dot color and hide the dot
                            hoverClasses = isDarkSquare
                                ? 'hover:bg-lime-200 hover:text-slate-900'
                                : 'hover:bg-emerald-300 hover:text-white';
                        } else if (glowType === 'check') {
                            backgroundClasses = isDarkSquare ? 'bg-red-700 text-white' : 'bg-red-200';
                            highlightClasses = '';
                            hoverClasses = '';
                        }
                    }

                    let content;
                    if (piece) {
                        const { imgSrc, altText, shortAlias } = getPiece(piece);
                        // fallback to displaying short alias text if img fails to load
                        content = failedImageIndices.has(index) ? (
                            <span aria-label={altText} className="text-xl font-semibold select-none">
                                {shortAlias}
                            </span>
                        ) : (
                            <img
                                className="w-full h-full"
                                src={imgSrc}
                                alt={altText}
                                onError={() =>
                                    setFailedImageIndices((prev) => {
                                        const next = new Set(prev);
                                        next.add(index);
                                        return next;
                                    })
                                }
                            />
                        );
                    }

                    return (
                        <button
                            key={`position-${index}`}
                            type="button"
                            onClick={createClickHandler(piece, index)}
                            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
                        >
                            {content}
                        </button>
                    );
                })}
            </div>

            <section>
                <button className="cursor-pointer border p-2" onClick={handleResetClick}>
                    RESET
                </button>
            </section>
        </main>
    );
}

export default ChessBoard;
