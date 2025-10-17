export type PieceAlias =
    | 'white_pawn'
    | 'white_rook'
    | 'white_knight'
    | 'white_bishop'
    | 'white_queen'
    | 'white_king'
    | 'black_pawn'
    | 'black_rook'
    | 'black_knight'
    | 'black_bishop'
    | 'black_queen'
    | 'black_king';
export type PieceShortAlias = 'P' | 'R' | 'N' | 'B' | 'Q' | 'K' | 'p' | 'r' | 'n' | 'b' | 'q' | 'k';
export type PieceColor = 'white' | 'black';
export type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
export type Piece = {
    alias: PieceAlias;
    shortAlias: PieceShortAlias;
    imgSrc: string;
    altText: string;
    startingIndices: number[];
    color: PieceColor;
    type: PieceType;
    value: 1 | 3 | 5 | 9 | 10;
};
export type PawnPromotion = Exclude<PieceShortAlias, 'p' | 'P' | 'k' | 'K'>;
type PieceSvgSet = 'cburnett' | 'staunty';

export const PAWN_PROMOTION_OPTIONS: Record<PieceColor, PawnPromotion[]> = {
    white: ['Q', 'R', 'B', 'N'],
    black: ['n', 'b', 'r', 'q'],
};

const WHITE_PIECES = new Set<PieceShortAlias>(['P', 'R', 'N', 'B', 'K', 'Q']);

const PIECE_SVGS_BASE_DIR = 'pieces';
const DEFAULT_SVG_SET: PieceSvgSet = 'staunty';
const PIECE_ALIAS_TO_FILE_PREFIX: Record<PieceAlias, string> = {
    black_bishop: 'bB',
    black_knight: 'bN',
    black_pawn: 'bP',
    black_rook: 'bR',
    black_queen: 'bQ',
    black_king: 'bK',
    white_bishop: 'wB',
    white_knight: 'wN',
    white_pawn: 'wP',
    white_rook: 'wR',
    white_queen: 'wQ',
    white_king: 'wK',
};

function getImgSrc(pieceAlias: PieceAlias, svgSet: PieceSvgSet = DEFAULT_SVG_SET): string {
    return `/${PIECE_SVGS_BASE_DIR}/${svgSet}/${PIECE_ALIAS_TO_FILE_PREFIX[pieceAlias]}.svg`;
}

export const WHITE_KING_START_INDEX = 60;
export const BLACK_KING_START_INDEX = 4;
export const aliasToPieceData: Record<PieceAlias, Piece> = {
    // White pieces
    white_pawn: {
        alias: 'white_pawn',
        shortAlias: 'P',
        imgSrc: getImgSrc('white_pawn'),
        altText: 'White Pawn',
        startingIndices: [48, 49, 50, 51, 52, 53, 54, 55],
        color: 'white',
        type: 'pawn',
        value: 1,
    },
    white_rook: {
        alias: 'white_rook',
        shortAlias: 'R',
        imgSrc: getImgSrc('white_rook'),
        altText: 'White Rook',
        startingIndices: [56, 63],
        color: 'white',
        type: 'rook',
        value: 5,
    },
    white_knight: {
        alias: 'white_knight',
        shortAlias: 'N',
        imgSrc: getImgSrc('white_knight'),
        altText: 'White Knight',
        startingIndices: [57, 62],
        color: 'white',
        type: 'knight',
        value: 3,
    },
    white_bishop: {
        alias: 'white_bishop',
        shortAlias: 'B',
        imgSrc: getImgSrc('white_bishop'),
        altText: 'White Bishop',
        startingIndices: [58, 61],
        color: 'white',
        type: 'bishop',
        value: 3,
    },
    white_queen: {
        alias: 'white_queen',
        shortAlias: 'Q',
        imgSrc: getImgSrc('white_queen'),
        altText: 'White Queen',
        startingIndices: [59],
        color: 'white',
        type: 'queen',
        value: 9,
    },
    white_king: {
        alias: 'white_king',
        shortAlias: 'K',
        imgSrc: getImgSrc('white_king'),
        altText: 'White King',
        startingIndices: [WHITE_KING_START_INDEX],
        color: 'white',
        type: 'king',
        value: 10,
    },

    // Black pieces
    black_pawn: {
        alias: 'black_pawn',
        shortAlias: 'p',
        imgSrc: getImgSrc('black_pawn'),
        altText: 'Black Pawn',
        startingIndices: [8, 9, 10, 11, 12, 13, 14, 15],
        color: 'black',
        type: 'pawn',
        value: 1,
    },
    black_rook: {
        alias: 'black_rook',
        shortAlias: 'r',
        imgSrc: getImgSrc('black_rook'),
        altText: 'Black Rook',
        startingIndices: [0, 7],
        color: 'black',
        type: 'rook',
        value: 5,
    },
    black_knight: {
        alias: 'black_knight',
        shortAlias: 'n',
        imgSrc: getImgSrc('black_knight'),
        altText: 'Black Knight',
        startingIndices: [1, 6],
        color: 'black',
        type: 'knight',
        value: 3,
    },
    black_bishop: {
        alias: 'black_bishop',
        shortAlias: 'b',
        imgSrc: getImgSrc('black_bishop'),
        altText: 'Black Bishop',
        startingIndices: [2, 5],
        color: 'black',
        type: 'bishop',
        value: 3,
    },
    black_queen: {
        alias: 'black_queen',
        shortAlias: 'q',
        imgSrc: getImgSrc('black_queen'),
        altText: 'Black Queen',
        startingIndices: [3],
        color: 'black',
        type: 'queen',
        value: 9,
    },
    black_king: {
        alias: 'black_king',
        shortAlias: 'k',
        imgSrc: getImgSrc('black_king'),
        altText: 'Black King',
        startingIndices: [BLACK_KING_START_INDEX],
        color: 'black',
        type: 'king',
        value: 10,
    },
};

// Unified lookup: allows both full alias (e.g., 'white_pawn') and
// short alias (e.g., 'P') to resolve to the same Piece object.
export const aliasOrShortToPieceData: Record<PieceAlias | PieceShortAlias, Piece> = Object.values(
    aliasToPieceData
).reduce(
    (allPieces, piece) => {
        allPieces[piece.alias] = piece;
        allPieces[piece.shortAlias] = piece;
        return allPieces;
    },
    {} as Record<PieceAlias | PieceShortAlias, Piece>
);

// Small helper for ergonomic access
export const getPiece = (key: PieceAlias | PieceShortAlias): Piece => aliasOrShortToPieceData[key];

export const uniquePieceImgSrcs = Array.from(new Set(Object.values(aliasToPieceData).map(({ imgSrc }) => imgSrc)));

export function getColorFromAlias(alias: PieceShortAlias): PieceColor {
    return WHITE_PIECES.has(alias) ? 'white' : 'black';
}

export function getEnemyColor(color: PieceColor): PieceColor {
    return color === 'white' ? 'black' : 'white';
}
