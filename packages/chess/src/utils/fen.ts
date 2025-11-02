import { InvalidInputError } from '@grouchess/errors';

import { algebraicNotationToIndex, createBoardFromFEN, rowColToIndex } from '../board.js';
import { isValidFEN } from '../notations.js';
import { isValidPieceAlias } from '../pieces.js';
import { NUM_COLS, NUM_ROWS, type CastleRightsByColor, type ChessBoardState, type ChessBoardType } from '../schema.js';

const VALID_CASTLING_FLAGS = new Set(['K', 'Q', 'k', 'q']);

/**
 * FEN PARSING AND VALIDATION UTILITIES
 */

/**
 * Creates a ChessBoardState from a given FEN string
 */
export function createBoardStateFromFEN(fenString: string): ChessBoardState {
    if (!isValidFEN(fenString)) {
        throw new InvalidInputError('Invalid FEN string');
    }

    const parts = fenString.trim().split(/\s+/);
    const [placementPart, activeColorPart, castlingPart, enPassantPart, halfmovePart, fullmovePart] = parts;

    return {
        board: createBoardFromFEN(placementPart),
        playerTurn: activeColorPart === 'w' ? 'white' : 'black',
        castleRightsByColor:
            castlingPart === '-'
                ? {
                      white: { short: false, long: false },
                      black: { short: false, long: false },
                  }
                : {
                      white: {
                          short: castlingPart.includes('K'),
                          long: castlingPart.includes('Q'),
                      },
                      black: {
                          short: castlingPart.includes('k'),
                          long: castlingPart.includes('q'),
                      },
                  },
        enPassantTargetIndex: enPassantPart === '-' ? null : algebraicNotationToIndex(enPassantPart),
        halfmoveClock: parseInt(halfmovePart, 10),
        fullmoveClock: parseInt(fullmovePart, 10),
    };
}

/**
 * Checks if a given en passant notation is valid (e.g., 'a-h3' or 'a-h6')
 */
export function isValidEnPassantNotation(notation: string): boolean {
    return /^[a-h][36]$/.test(notation);
}

/**
 * Validates whether a given piece placement part of a FEN string is well-formed
 */
export function isValidPiecePlacement(piecePlacement: string): boolean {
    const ranks = piecePlacement.split('/');
    if (ranks.length !== NUM_ROWS) return false;

    let whiteKingCount = 0;
    let blackKingCount = 0;

    for (const rank of ranks) {
        let fileCount = 0;

        for (const char of rank) {
            if (char >= '1' && char <= '8') {
                fileCount += Number(char);
            } else if (isValidPieceAlias(char)) {
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

/**
 * Validates whether a given castling availability part of a FEN string is well-formed
 */
export function isValidCastlingAvailability(castling: string): boolean {
    if (castling === '-') return true;
    const seen = new Set<string>();
    for (const char of castling) {
        if (!VALID_CASTLING_FLAGS.has(char) || seen.has(char)) return false;
        seen.add(char);
    }
    return castling.length > 0;
}

/**
 * Validates whether a given en passant target square in a FEN string is well-formed
 */
export function isValidEnPassantTarget(enPassant: string, activeColor: string): boolean {
    if (enPassant === '-') return true;
    if (!isValidEnPassantNotation(enPassant)) return false;
    const rank = enPassant.charAt(1);
    return (activeColor === 'w' && rank === '6') || (activeColor === 'b' && rank === '3');
}

/**
 * Checks if a given string represents a positive integer (greater than zero)
 */
export function isPositiveInteger(value: string): boolean {
    if (!/^\d+$/.test(value)) return false;
    const num = Number(value);
    return Number.isInteger(num) && num > 0 && String(num) === value;
}

/**
 * Checks if a given string represents a non-negative integer (zero or positive)
 */
export function isNonNegativeInteger(value: string): boolean {
    if (!/^\d+$/.test(value)) return false;
    const num = Number(value);
    return Number.isInteger(num) && num >= 0 && String(num) === value;
}

/**
 * FEN CREATION UTILITIES
 */

/**
 * Creates the piece placement part of a FEN string from a ChessBoardType
 */
export function createPiecePlacementFromBoard(board: ChessBoardType): string {
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
    return placementRows.join('/');
}

/**
 * Creates the castling availability part of a FEN string from castle rights
 */
export function createCastlingRightsFENPart(castleRightsByColor: CastleRightsByColor): string {
    let castling = '';
    if (castleRightsByColor.white.short) castling += 'K';
    if (castleRightsByColor.white.long) castling += 'Q';
    if (castleRightsByColor.black.short) castling += 'k';
    if (castleRightsByColor.black.long) castling += 'q';
    if (castling.length === 0) castling = '-';
    return castling;
}
