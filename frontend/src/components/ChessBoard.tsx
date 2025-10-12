import { useState } from 'react';
import { indexToRowCol, NUM_SQUARES, type GlowingSquare } from '../utils/board';
import { getPiece, aliasToPieceData } from '../utils/pieces';
import type { PieceShortAlias, PieceColor, ChessBoardType } from '../utils/pieces';
import {
    computePossibleMovesForPiece,
    computeNextChessBoardFromMove,
    computeCastleMetadataChangesFromMove,
    type CastleMetadata,
} from '../utils/moves';

const CHESS_SQUARE_BASE_CLASSES =
    'relative aspect-square cursor-pointer flex items-center justify-center transition-colors';

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

function createInitialCastleMetadata(): CastleMetadata {
    return {
        whiteKingHasMoved: false,
        whiteShortRookHasMoved: false,
        whiteLongRookHasMoved: false,
        blackKingHasMoved: false,
        blackShortRookHasMoved: false,
        blackLongRookHasMoved: false,
    };
}

function ChessBoard() {
    const [board, setBoard] = useState<ChessBoardType>(createInitialBoard);
    const [castleMetadata, setCastleMetadata] = useState<CastleMetadata>(createInitialCastleMetadata);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [playerTurn, setPlayerTurn] = useState<PieceColor>('white');
    const [previousMoveIndices, setPreviousMoveIndices] = useState<number[]>([]);
    const [failedImageIndices, setFailedImageIndices] = useState<Set<number>>(new Set());

    const selectedPiece = selectedIndex !== null ? getPiece(board[selectedIndex] as PieceShortAlias) : null;
    const possibleMoveIndices = selectedPiece
        ? computePossibleMovesForPiece(selectedPiece, selectedIndex as number, board, castleMetadata)
        : [];
    const glowingSquares = [
        ...previousMoveIndices.map((index) => ({ index, type: 'previous-move' })),
        ...possibleMoveIndices.map((index) => ({ index, type: 'possible-move' })),
    ] as GlowingSquare[];

    function handleResetClick() {
        setBoard(createInitialBoard);
        setCastleMetadata(createInitialCastleMetadata);
        setSelectedIndex(null);
        setPlayerTurn('white');
        setPreviousMoveIndices([]);
    }

    function clearSelection() {
        setSelectedIndex(null);
    }

    function movePiece(pieceAlias: PieceShortAlias, prevIndex: number, nextIndex: number) {
        const pieceData = getPiece(pieceAlias);

        setBoard((prevBoard) => computeNextChessBoardFromMove(pieceData, prevIndex, nextIndex, prevBoard));
        if (pieceData.type === 'king' || pieceData.type === 'rook') {
            setCastleMetadata((prevData) => ({
                ...prevData,
                ...computeCastleMetadataChangesFromMove(pieceData, prevIndex),
            }));
        }
        clearSelection();
        setPreviousMoveIndices([prevIndex, nextIndex]);
        setPlayerTurn((prevTurn) => (prevTurn === 'white' ? 'black' : 'white'));
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
            movePiece(selectedPiece.shortAlias, selectedIndex as number, clickedIndex);
            return;
        }

        if (!pieceAtSquare) {
            clearSelection();
            return;
        }

        // if no selected piece, set current square to selected index
        setSelectedIndex(clickedIndex);
    };

    return (
        <main className="flex flex-col gap-y-8">
            <div className="grid grid-cols-8 rounded-lg overflow-hidden shadow-lg shadow-white/30">
                {board.map((piece, index) => {
                    const { row, col } = indexToRowCol(index);
                    const isDarkSquare = row % 2 === (col % 2 === 0 ? 1 : 0);
                    const glowTypesForSquare = glowingSquares
                        .filter(({ index: glowingIndex }) => glowingIndex === index)
                        .map(({ type }) => type);
                    const isPreviousMove = glowTypesForSquare.includes('previous-move');
                    const isPossibleMove = glowTypesForSquare.includes('possible-move');
                    const isCheck = glowTypesForSquare.includes('check');
                    const isSelected = index === selectedIndex;

                    let backgroundClasses = isDarkSquare ? 'bg-slate-500 text-white' : 'bg-stone-50';
                    let highlightClasses = '';
                    let hoverClasses = '';
                    if (isSelected) {
                        backgroundClasses = isDarkSquare ? 'bg-emerald-600 text-white' : 'bg-emerald-200';
                        highlightClasses = '';
                    } else {
                        if (isCheck) {
                            backgroundClasses = isDarkSquare ? 'bg-red-700 text-white' : 'bg-red-200';
                        } else if (isPreviousMove) {
                            backgroundClasses = isDarkSquare ? 'bg-purple-300 text-white' : 'bg-purple-200';
                        }
                        if (isPossibleMove) {
                            const backgroundColor = isDarkSquare
                                ? 'after:bg-emerald-500/90'
                                : 'after:bg-emerald-300/80';
                            highlightClasses = `after:absolute after:left-1/2 after:top-1/2 after:h-6 after:w-6 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full ${backgroundColor} after:content-[""] hover:after:opacity-0`;
                            // On hover, softly recolor the square to match the dot color and hide the dot
                            hoverClasses = isDarkSquare ? 'hover:bg-emerald-500' : 'hover:bg-emerald-300';
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
                            onMouseDown={createClickHandler(piece, index)}
                            className={`${CHESS_SQUARE_BASE_CLASSES} ${backgroundClasses} ${highlightClasses} ${hoverClasses}`}
                        >
                            {content}
                        </button>
                    );
                })}
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
