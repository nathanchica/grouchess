import { NUM_ROWS } from '@grouchess/models';
import type { ChessBoardState, ChessGameState, LegalMovesStore, Move, PieceAlias } from '@grouchess/models';
import invariant from 'tiny-invariant';

import { indexToRowCol } from './board.js';
import {
    createCastlingRightsFENPart,
    createPiecePlacementFromBoard,
    isValidPiecePlacement,
    isValidCastlingAvailability,
    isNonNegativeInteger,
    isPositiveInteger,
    isValidEnPassantTarget,
} from './utils/fen.js';

type Disambiguator = 'none' | 'file' | 'rank' | 'both';

const LOWERCASE_A_CHARCODE = 'a'.charCodeAt(0);
const SHORT_ALIAS_TO_FIGURINE_UNICODE: Partial<Record<PieceAlias, string>> = {
    K: '\u265A',
    Q: '\u265B',
    R: '\u265C',
    B: '\u265D',
    N: '\u265E',
};

function getFileFromColumn(col: number) {
    return String.fromCharCode(LOWERCASE_A_CHARCODE + col);
}

/**
 * Converts a board index (0-63) to algebraic notation (e.g., 0 -> 'a8', 63 -> 'h1').
 */
export function indexToAlgebraicNotation(index: number): string {
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
    gameStatus: ChessGameState,
    legalMovesStore: LegalMovesStore,
    useFigurine: boolean = false
): string {
    const { startIndex, endIndex, piece, captureIndex, type, promotion } = move;
    if (type === 'short-castle') {
        return 'O-O';
    } else if (type === 'long-castle') {
        return 'O-O-O';
    }

    const { type: pieceType, alias } = piece;
    const isPawn = pieceType === 'pawn';
    const isCapture = captureIndex !== undefined;

    const { row, col } = indexToRowCol(startIndex);
    let prefix = '';
    if (!isPawn) {
        const normalizedAlias = alias.toUpperCase() as PieceAlias;
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

/**
 * Creates a FEN string representing the current game state.
 * Fields: piece placement, active color, castling availability, en passant target, halfmove clock, fullmove number.
 */
export function createFEN({
    board,
    playerTurn,
    castleRightsByColor,
    enPassantTargetIndex,
    halfmoveClock,
    fullmoveClock,
}: ChessBoardState): string {
    const piecePlacement = createPiecePlacementFromBoard(board);
    const activeColor = playerTurn.charAt(0); // 'w' or 'b'
    const castling = createCastlingRightsFENPart(castleRightsByColor); // Castling rights (not immediate legality)
    const enPassant = enPassantTargetIndex !== null ? indexToAlgebraicNotation(enPassantTargetIndex) : '-';

    return `${piecePlacement} ${activeColor} ${castling} ${enPassant} ${halfmoveClock} ${fullmoveClock}`;
}

/**
 * Validates whether a given FEN string is well-formed.
 */
export function isValidFEN(fenString: string): boolean {
    const fields = fenString.trim().split(/\s+/);
    if (fields.length !== 6) return false;

    const [piecePlacement, activeColor, castling, enPassant, halfmoveClock, fullmoveClock] = fields;

    if (!isValidPiecePlacement(piecePlacement)) return false;
    if (!/^[wb]$/.test(activeColor)) return false;
    if (!isValidCastlingAvailability(castling)) return false;
    if (!isValidEnPassantTarget(enPassant, activeColor)) return false;
    if (!isNonNegativeInteger(halfmoveClock)) return false;
    if (!isPositiveInteger(fullmoveClock)) return false;

    return true;
}
