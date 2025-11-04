import type { PawnPromotion, PieceAlias, PieceColor } from '@grouchess/models';

type PieceSvgSet = 'cburnett' | 'staunty';

export const PAWN_PROMOTION_OPTIONS: Record<PieceColor, PawnPromotion[]> = {
    white: ['Q', 'R', 'B', 'N'],
    black: ['n', 'b', 'r', 'q'],
};

const PIECE_SVGS_BASE_DIR = 'pieces';
const DEFAULT_SVG_SET: PieceSvgSet = 'staunty';
const PIECE_ALIAS_TO_FILE_PREFIX: Record<PieceAlias, string> = {
    b: 'bB',
    n: 'bN',
    p: 'bP',
    r: 'bR',
    q: 'bQ',
    k: 'bK',
    B: 'wB',
    N: 'wN',
    P: 'wP',
    R: 'wR',
    Q: 'wQ',
    K: 'wK',
};

function getImgSrc(pieceAlias: PieceAlias, svgSet: PieceSvgSet = DEFAULT_SVG_SET): string {
    return `/${PIECE_SVGS_BASE_DIR}/${svgSet}/${PIECE_ALIAS_TO_FILE_PREFIX[pieceAlias]}.svg`;
}

type PieceImageData = {
    imgSrc: string;
    altText: string;
};
export const aliasToPieceImageData: Record<PieceAlias, PieceImageData> = {
    // White pieces
    P: {
        imgSrc: getImgSrc('P'),
        altText: 'White Pawn',
    },
    R: {
        imgSrc: getImgSrc('R'),
        altText: 'White Rook',
    },
    N: {
        imgSrc: getImgSrc('N'),
        altText: 'White Knight',
    },
    B: {
        imgSrc: getImgSrc('B'),
        altText: 'White Bishop',
    },
    Q: {
        imgSrc: getImgSrc('Q'),
        altText: 'White Queen',
    },
    K: {
        imgSrc: getImgSrc('K'),
        altText: 'White King',
    },
    p: {
        imgSrc: getImgSrc('p'),
        altText: 'Black Pawn',
    },
    r: {
        imgSrc: getImgSrc('r'),
        altText: 'Black Rook',
    },
    n: {
        imgSrc: getImgSrc('n'),
        altText: 'Black Knight',
    },
    b: {
        imgSrc: getImgSrc('b'),
        altText: 'Black Bishop',
    },
    q: {
        imgSrc: getImgSrc('q'),
        altText: 'Black Queen',
    },
    k: {
        imgSrc: getImgSrc('k'),
        altText: 'Black King',
    },
};

export const uniquePieceImgSrcs = Array.from(new Set(Object.values(aliasToPieceImageData).map(({ imgSrc }) => imgSrc)));
