import type { PieceAlias, Piece, PieceColor } from './schema.js';

export const WHITE_KING_START_INDEX = 60;
export const BLACK_KING_START_INDEX = 4;

const WHITE_PIECES = new Set<PieceAlias>(['P', 'R', 'N', 'B', 'K', 'Q']);

export const aliasToPieceData: Record<PieceAlias, Piece> = {
    // White pieces
    P: {
        alias: 'P',
        startingIndices: [48, 49, 50, 51, 52, 53, 54, 55],
        color: 'white',
        type: 'pawn',
        value: 1,
    },
    R: {
        alias: 'R',
        startingIndices: [56, 63],
        color: 'white',
        type: 'rook',
        value: 5,
    },
    N: {
        alias: 'N',
        startingIndices: [57, 62],
        color: 'white',
        type: 'knight',
        value: 3,
    },
    B: {
        alias: 'B',
        startingIndices: [58, 61],
        color: 'white',
        type: 'bishop',
        value: 3,
    },
    Q: {
        alias: 'Q',
        startingIndices: [59],
        color: 'white',
        type: 'queen',
        value: 9,
    },
    K: {
        alias: 'K',
        startingIndices: [WHITE_KING_START_INDEX],
        color: 'white',
        type: 'king',
        value: 10,
    },

    // Black pieces
    p: {
        alias: 'p',
        startingIndices: [8, 9, 10, 11, 12, 13, 14, 15],
        color: 'black',
        type: 'pawn',
        value: 1,
    },
    r: {
        alias: 'r',
        startingIndices: [0, 7],
        color: 'black',
        type: 'rook',
        value: 5,
    },
    n: {
        alias: 'n',
        startingIndices: [1, 6],
        color: 'black',
        type: 'knight',
        value: 3,
    },
    b: {
        alias: 'b',
        startingIndices: [2, 5],
        color: 'black',
        type: 'bishop',
        value: 3,
    },
    q: {
        alias: 'q',
        startingIndices: [3],
        color: 'black',
        type: 'queen',
        value: 9,
    },
    k: {
        alias: 'k',
        startingIndices: [BLACK_KING_START_INDEX],
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
