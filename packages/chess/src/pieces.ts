import type { PieceAlias, Piece, PieceColor } from '@grouchess/models';

export const WHITE_KING_START_INDEX = 60;
export const BLACK_KING_START_INDEX = 4;

const WHITE_PIECES = new Set<PieceAlias>(['P', 'R', 'N', 'B', 'K', 'Q']);

export const aliasToPieceData: Record<PieceAlias, Piece> = {
    // White pieces
    P: {
        alias: 'P',
        color: 'white',
        type: 'pawn',
        value: 1,
    },
    R: {
        alias: 'R',
        color: 'white',
        type: 'rook',
        value: 5,
    },
    N: {
        alias: 'N',
        color: 'white',
        type: 'knight',
        value: 3,
    },
    B: {
        alias: 'B',
        color: 'white',
        type: 'bishop',
        value: 3,
    },
    Q: {
        alias: 'Q',
        color: 'white',
        type: 'queen',
        value: 9,
    },
    K: {
        alias: 'K',
        color: 'white',
        type: 'king',
        value: 10,
    },

    // Black pieces
    p: {
        alias: 'p',
        color: 'black',
        type: 'pawn',
        value: 1,
    },
    r: {
        alias: 'r',
        color: 'black',
        type: 'rook',
        value: 5,
    },
    n: {
        alias: 'n',
        color: 'black',
        type: 'knight',
        value: 3,
    },
    b: {
        alias: 'b',
        color: 'black',
        type: 'bishop',
        value: 3,
    },
    q: {
        alias: 'q',
        color: 'black',
        type: 'queen',
        value: 9,
    },
    k: {
        alias: 'k',
        color: 'black',
        type: 'king',
        value: 10,
    },
};

export function getPiece(alias: PieceAlias): Piece {
    return aliasToPieceData[alias];
}

export function getColorFromAlias(alias: PieceAlias): PieceColor {
    return WHITE_PIECES.has(alias) ? 'white' : 'black';
}

export function getEnemyColor(color: PieceColor): PieceColor {
    return color === 'white' ? 'black' : 'white';
}

const VALID_PIECE_ALIAS_PATTERN = /^[pnbrqkPNBRQK]$/;
export function isValidPieceAlias(alias: string): alias is PieceAlias {
    return VALID_PIECE_ALIAS_PATTERN.test(alias);
}
