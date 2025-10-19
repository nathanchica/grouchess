import { indexToRowCol, NUM_ROWS } from './board';
import { type Move } from './moves';
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

/**
 * Creates the algebraic notation for a given move.
 * @param move The move to create notation for.
 * @param gameStatus The current game status.
 * @param useFigurine Whether to use figurine notation. Defaults to false. (e.g. ♞c6 instead of Nc6)
 * @returns The algebraic notation for the move.
 */
export function createAlgebraicNotation(
    { startIndex, endIndex, piece, captureIndex, type, promotion }: Move,
    gameStatus: GameStatus,
    useFigurine: boolean = false
): string {
    if (type === 'short-castle') {
        return 'O-O';
    } else if (type === 'long-castle') {
        return 'O-O-O';
    }

    const { type: pieceType, shortAlias } = piece;
    const isPawn = pieceType === 'pawn';
    const isCapture = captureIndex !== undefined;

    let prefix = '';
    if (!isPawn) {
        const normalizedAlias = shortAlias.toUpperCase() as PieceShortAlias;
        const figurine = SHORT_ALIAS_TO_FIGURINE_UNICODE[normalizedAlias];
        prefix = useFigurine && figurine ? figurine : normalizedAlias;
    } else if (isPawn && isCapture) {
        const { col } = indexToRowCol(startIndex);
        prefix = getFileFromColumn(col);
    }

    let suffix = '';
    if (gameStatus.check) suffix = gameStatus.status === 'checkmate' ? '#' : '+';
    if (type === 'en-passant') suffix += ' e.p.';

    const promotionPart = promotion ? `=${promotion.toUpperCase()}` : '';

    return `${prefix}${isCapture ? 'x' : ''}${indexToAlgebraicNotation(endIndex)}${promotionPart}${suffix}`;
}
