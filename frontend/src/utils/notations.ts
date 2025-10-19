import invariant from 'tiny-invariant';

import { indexToRowCol, NUM_ROWS } from './board';
import { type LegalMovesStore, type Move } from './moves';
import { type PieceShortAlias } from './pieces';

import { type GameStatus } from '../providers/ChessGameProvider';

export type MoveNotation = {
    // For display or common use. Standard (short-form) algebraic notation.
    algebraicNotation: string;
    // For international display or common use. Uses unicode symbols for pieces (e.g. ♞c6 instead of Nc6)
    figurineAlgebraicNotation?: string;
    // For Universal Chess Interface (UCI). Variant of long-form algebraic notation.
    longAlgebraicNotation?: string;
};

type Disambiguator = 'none' | 'file' | 'rank' | 'both';

const LOWERCASE_A_CHARCODE = 97;
const SHORT_ALIAS_TO_FIGURINE_UNICODE: Partial<Record<PieceShortAlias, string>> = {
    K: '\u265A',
    Q: '\u265B',
    R: '\u265C',
    B: '\u265D',
    N: '\u265E',
};

function getFileFromColumn(col: number) {
    return String.fromCharCode(LOWERCASE_A_CHARCODE + col);
}

function indexToAlgebraicNotation(index: number): string {
    const { row, col } = indexToRowCol(index);
    return `${getFileFromColumn(col)}${NUM_ROWS - row}`;
}

function disambiguatorForMove({ startIndex, endIndex, piece }: Move, legalMovesStore: LegalMovesStore): Disambiguator {
    const key = `${piece.type}:${endIndex}` as const;
    invariant(key in legalMovesStore.typeAndEndIndexToStartIndex, `No legal moves found for key: ${key}`);
    const startIndices = legalMovesStore.typeAndEndIndexToStartIndex[key];
    if (startIndices.length <= 1) return 'none';

    const { col: movingPieceCol, row: movingPieceRow } = indexToRowCol(startIndex);
    const otherPieces = startIndices.filter((index) => index !== startIndex);
    const sameFile = otherPieces.some((index) => indexToRowCol(index).col === movingPieceCol);
    const sameRank = otherPieces.some((index) => indexToRowCol(index).row === movingPieceRow);

    if (!sameFile) return 'file';
    if (!sameRank) return 'rank';
    return 'both';
}

/**
 * Creates the algebraic notation for a given move.
 * @param move The move to create notation for.
 * @param gameStatus The current game status.
 * @param useFigurine Whether to use figurine notation. Defaults to false. (e.g. ♞c6 instead of Nc6)
 * @returns The algebraic notation for the move.
 */
export function createAlgebraicNotation(
    move: Move,
    gameStatus: GameStatus,
    legalMovesStore: LegalMovesStore,
    useFigurine: boolean = false
): string {
    const { startIndex, endIndex, piece, captureIndex, type, promotion } = move;
    if (type === 'short-castle') {
        return 'O-O';
    } else if (type === 'long-castle') {
        return 'O-O-O';
    }

    const { type: pieceType, shortAlias } = piece;
    const isPawn = pieceType === 'pawn';
    const isCapture = captureIndex !== undefined;

    const { row, col } = indexToRowCol(startIndex);
    let prefix = '';
    if (!isPawn) {
        const normalizedAlias = shortAlias.toUpperCase() as PieceShortAlias;
        const figurine = SHORT_ALIAS_TO_FIGURINE_UNICODE[normalizedAlias];
        prefix = useFigurine && figurine ? figurine : normalizedAlias;
    }

    const disambiguator = disambiguatorForMove(move, legalMovesStore);
    if (disambiguator === 'file' || (isPawn && isCapture)) {
        prefix += getFileFromColumn(col);
    } else if (disambiguator === 'rank') {
        prefix += NUM_ROWS - row;
    } else if (disambiguator === 'both') {
        prefix += `${getFileFromColumn(col)}${NUM_ROWS - row}`;
    }

    let suffix = '';
    if (gameStatus.check) suffix = gameStatus.status === 'checkmate' ? '#' : '+';
    if (type === 'en-passant') suffix += ' e.p.';

    const promotionPart = promotion ? `=${promotion.toUpperCase()}` : '';

    return `${prefix}${isCapture ? 'x' : ''}${indexToAlgebraicNotation(endIndex)}${promotionPart}${suffix}`;
}
