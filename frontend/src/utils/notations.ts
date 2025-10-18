import { indexToRowCol, NUM_ROWS } from './board';
import { type Move } from './moves';

import { type GameStatus } from '../providers/ChessGameProvider';

export type MoveNotation = {
    // For display or common use
    algebraicNotation: string;
    // For Universal Chess Interface (UCI)
    longAlgebraicNotation?: string;
};

const LOWERCASE_A_CHARCODE = 97;

function getFileFromColumn(col: number) {
    return String.fromCharCode(LOWERCASE_A_CHARCODE + col);
}

function indexToAlgebraicNotation(index: number): string {
    const { row, col } = indexToRowCol(index);
    return `${getFileFromColumn(col)}${NUM_ROWS - row}`;
}

export function createAlgebraicNotation(
    { startIndex, endIndex, piece, captureIndex, type }: Move,
    gameStatus: GameStatus
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
        prefix = shortAlias.toUpperCase();
    } else if (isPawn && isCapture) {
        const { col } = indexToRowCol(startIndex);
        prefix = getFileFromColumn(col);
    }

    let suffix = '';
    if (gameStatus.check) suffix = gameStatus.status === 'checkmate' ? '#' : '+';

    return `${prefix}${isCapture ? 'x' : ''}${indexToAlgebraicNotation(endIndex)}${suffix}`;
}
