import invariant from 'tiny-invariant';

import { indexToRowCol, rowColToIndex, NUM_COLS, NUM_ROWS, type ChessBoardType } from './board';
import { type CastleRightsByColor, type LegalMovesStore, type Move } from './moves';
import { isValidPieceShortAlias, type PieceColor, type PieceShortAlias } from './pieces';

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

/**
 * Creates a FEN string representing the current game state.
 * Fields: piece placement, active color, castling availability, en passant target, halfmove clock, fullmove number.
 */
export function createFEN(
    board: ChessBoardType,
    playerTurn: PieceColor,
    castleRightsByColor: CastleRightsByColor,
    enPassantTargetIndex: number | null,
    halfmoveClock: number,
    fullmoveClock: number
): string {
    // Piece placement (from 8th rank to 1st)
    let placementRows: string[] = [];
    for (let row = 0; row < NUM_ROWS; row++) {
        let rowStr = '';
        let emptyCount = 0;
        for (let col = 0; col < NUM_COLS; col++) {
            const index = rowColToIndex({ row, col });
            const pieceAlias = board[index];
            if (pieceAlias) {
                if (emptyCount > 0) {
                    rowStr += String(emptyCount);
                    emptyCount = 0;
                }
                rowStr += pieceAlias;
            } else {
                emptyCount++;
            }
        }
        if (emptyCount > 0) rowStr += String(emptyCount);
        placementRows.push(rowStr);
    }
    const piecePlacement = placementRows.join('/');

    // Active color
    const activeColor = playerTurn.charAt(0); // 'w' or 'b'

    // Castling availability (rights, not immediate legality)
    let castling = '';
    if (castleRightsByColor.white.canShortCastle) castling += 'K';
    if (castleRightsByColor.white.canLongCastle) castling += 'Q';
    if (castleRightsByColor.black.canShortCastle) castling += 'k';
    if (castleRightsByColor.black.canLongCastle) castling += 'q';
    if (castling.length === 0) castling = '-';

    // En passant target square
    const enPassant = enPassantTargetIndex !== null ? indexToAlgebraicNotation(enPassantTargetIndex) : '-';

    return `${piecePlacement} ${activeColor} ${castling} ${enPassant} ${halfmoveClock} ${fullmoveClock}`;
}

export function isValidAlgebraicNotation(notation: string): boolean {
    return /^[a-h][36]$/.test(notation);
}

const VALID_CASTLING_FLAGS = new Set(['K', 'Q', 'k', 'q']);

function isValidPiecePlacement(piecePlacement: string): boolean {
    const ranks = piecePlacement.split('/');
    if (ranks.length !== NUM_ROWS) return false;

    let whiteKingCount = 0;
    let blackKingCount = 0;

    for (const rank of ranks) {
        let fileCount = 0;

        for (const char of rank) {
            if (char >= '1' && char <= '8') {
                fileCount += Number(char);
            } else if (isValidPieceShortAlias(char)) {
                fileCount += 1;
                if (char === 'K') whiteKingCount += 1;
                if (char === 'k') blackKingCount += 1;
            } else {
                return false;
            }

            if (fileCount > NUM_COLS) return false;
        }

        if (fileCount !== NUM_COLS) return false;
    }

    return whiteKingCount === 1 && blackKingCount === 1;
}

function isValidCastlingAvailability(castling: string): boolean {
    if (castling === '-') return true;
    const seen = new Set<string>();
    for (const char of castling) {
        if (!VALID_CASTLING_FLAGS.has(char) || seen.has(char)) return false;
        seen.add(char);
    }
    return castling.length > 0;
}

function isValidEnPassantTarget(enPassant: string, activeColor: string): boolean {
    if (enPassant === '-') return true;
    if (!isValidAlgebraicNotation(enPassant)) return false;
    const rank = enPassant.charAt(1);
    return (activeColor === 'w' && rank === '6') || (activeColor === 'b' && rank === '3');
}

function isPositiveInteger(value: string): boolean {
    if (!/^\d+$/.test(value)) return false;
    const num = Number(value);
    return Number.isInteger(num) && num > 0 && String(num) === value;
}

export function isValidFEN(fenString: string): boolean {
    const fields = fenString.trim().split(/\s+/);
    if (fields.length !== 6) return false;

    const [piecePlacement, activeColor, castling, enPassant, halfmoveClock, fullmoveClock] = fields;

    if (!isValidPiecePlacement(piecePlacement)) return false;
    if (!/^[wb]$/.test(activeColor)) return false;
    if (!isValidCastlingAvailability(castling)) return false;
    if (!isValidEnPassantTarget(enPassant, activeColor)) return false;
    if (!isPositiveInteger(halfmoveClock)) return false;
    if (!isPositiveInteger(fullmoveClock)) return false;

    return true;
}
