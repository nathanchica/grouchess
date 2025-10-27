import invariant from 'tiny-invariant';

import { createFEN } from './notations.js';
import { getPiece } from './pieces.js';
import type { ChessBoardState, ChessBoardType, ChessGameStatus, PieceColor } from './schema.js';

type MaterialSummary = {
    pawns: number;
    rooks: number;
    queens: number;
    knights: number;
    bishops: number;
};

/**
 * fifty consecutive moves (i.e. 100 single moves) occurring without any capture or any pawn move
 * https://www.janko.at/Retros/Glossary/FiftyMoves.htm
 */
const FIFTY_MOVE_RULE_HALFMOVES = 100;

const DRAW_STATUSES: ReadonlySet<ChessGameStatus> = new Set<ChessGameStatus>([
    'stalemate',
    '50-move-draw',
    'threefold-repetition',
    'draw-by-agreement',
    'insufficient-material',
] as const);

export function isDrawStatus(status: ChessGameStatus): boolean {
    return DRAW_STATUSES.has(status);
}

export function createRepetitionKeyFromBoardState(boardState: ChessBoardState): string {
    const fenString = createFEN(boardState);
    const [placementPart, activeColorPart, castlingPart, enPassantPart] = fenString.trim().split(/\s+/);
    return `${placementPart} ${activeColorPart} ${castlingPart} ${enPassantPart}`;
}

/**
 * Determines whether neither side can possibly checkmate given the remaining material.
 * Considers the following drawn cases:
 * - King vs king (bare kings)
 * - If both sides have any one of the following, and there are no pawns on the board the game will end in a draw:
 *     - A lone king
 *     - A king and bishop
 *     - A king and knight
 * - King + two knights vs king (per chess.com's rule, which differs from FIDE rules)
 *
 * https://support.chess.com/en/articles/8705277-what-does-insufficient-mating-material-mean
 */
export function hasInsufficientMatingMaterial(board: ChessBoardType): boolean {
    const material: Record<PieceColor, MaterialSummary> = {
        white: { pawns: 0, rooks: 0, queens: 0, knights: 0, bishops: 0 },
        black: { pawns: 0, rooks: 0, queens: 0, knights: 0, bishops: 0 },
    };

    board.forEach((alias) => {
        if (!alias) return;
        const { color, type } = getPiece(alias);
        const colorMaterial = material[color];
        switch (type) {
            case 'pawn':
                colorMaterial.pawns += 1;
                break;
            case 'rook':
                colorMaterial.rooks += 1;
                break;
            case 'queen':
                colorMaterial.queens += 1;
                break;
            case 'knight':
                colorMaterial.knights += 1;
                break;
            case 'bishop':
                colorMaterial.bishops += 1;
                break;
            case 'king':
                break;
            default:
                invariant(false, `Unexpected piece type '${type}'`);
        }
    });

    const hasMajorMaterial = ({ pawns, rooks, queens }: MaterialSummary): boolean =>
        pawns > 0 || rooks > 0 || queens > 0;
    if (hasMajorMaterial(material.white) || hasMajorMaterial(material.black)) return false;

    const whiteMinor = material.white.bishops + material.white.knights;
    const blackMinor = material.black.bishops + material.black.knights;

    if (whiteMinor === 0 && blackMinor === 0) return true;

    const whiteHasNoMinor = whiteMinor === 0;
    const blackHasNoMinor = blackMinor === 0;
    const whiteHasSingleMinor = whiteMinor === 1 && material.white.bishops <= 1 && material.white.knights <= 1;
    const blackHasSingleMinor = blackMinor === 1 && material.black.bishops <= 1 && material.black.knights <= 1;

    if ((whiteHasNoMinor || whiteHasSingleMinor) && (blackHasNoMinor || blackHasSingleMinor)) return true;

    const whiteTwoKnightsOnly = material.white.knights === 2 && material.white.bishops === 0;
    const blackTwoKnightsOnly = material.black.knights === 2 && material.black.bishops === 0;

    if ((whiteTwoKnightsOnly && blackHasNoMinor) || (blackTwoKnightsOnly && whiteHasNoMinor)) return true;

    return false;
}

/**
 * Computes if the current position is a forced draw due to insufficient material, stalemate, or 50-move rule.
 * Assumes both kings are not in check.
 */
export function computeForcedDrawStatus(
    board: ChessBoardType,
    hasNoLegalMoves: boolean,
    halfmoveClock: number,
    positionCounts: Record<string, number>
): ChessGameStatus | null {
    if (hasNoLegalMoves) {
        return 'stalemate';
    } else if (halfmoveClock >= FIFTY_MOVE_RULE_HALFMOVES) {
        return '50-move-draw';
    } else if (hasInsufficientMatingMaterial(board)) {
        return 'insufficient-material';
    } else if (Object.values(positionCounts).some((count) => count >= 3)) {
        return 'threefold-repetition';
    }

    return null;
}
