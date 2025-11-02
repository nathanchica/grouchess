import { createBoardFromFEN, algebraicNotationToIndex } from '../board.js';
import { createAlgebraicNotation, createFEN, indexToAlgebraicNotation, isValidFEN } from '../notations.js';
import { getPiece } from '../pieces.js';
import {
    type ChessBoardState,
    type ChessGameState,
    type LegalMovesStore,
    type Move,
    type PieceAlias,
} from '../schema.js';

function createLegalMovesStore(pieceAlias: PieceAlias, endIndex: number, startIndices: number[]): LegalMovesStore {
    const { type } = getPiece(pieceAlias);
    return {
        allMoves: [],
        byStartIndex: {},
        typeAndEndIndexToStartIndex: {
            [`${type}:${endIndex}`]: startIndices,
        },
    };
}

describe('indexToAlgebraicNotation', () => {
    it.each([
        { scenario: 'lower left corner', index: 0, expected: 'a8' },
        { scenario: 'upper right corner', index: 63, expected: 'h1' },
        { scenario: 'middle of the board', index: 27, expected: 'd5' },
    ])('converts $scenario (index $index) to $expected', ({ index, expected }) => {
        expect(indexToAlgebraicNotation(index)).toBe(expected);
    });
});

describe('createAlgebraicNotation', () => {
    const defaultGameState: ChessGameState = { status: 'in-progress' };
    const figurineGameState: ChessGameState = { status: 'in-progress' };

    it.each([
        {
            scenario: 'short castling',
            move: {
                startIndex: algebraicNotationToIndex('e1'),
                endIndex: algebraicNotationToIndex('g1'),
                type: 'short-castle',
                piece: getPiece('K'),
            } satisfies Partial<Move>,
            expected: 'O-O',
        },
        {
            scenario: 'long castling',
            move: {
                startIndex: algebraicNotationToIndex('e8'),
                endIndex: algebraicNotationToIndex('c8'),
                type: 'long-castle',
                piece: getPiece('k'),
            } satisfies Partial<Move>,
            expected: 'O-O-O',
        },
    ])('returns $expected for $scenario', ({ move, expected }) => {
        const legalMovesStore: LegalMovesStore = { allMoves: [], byStartIndex: {}, typeAndEndIndexToStartIndex: {} };
        expect(createAlgebraicNotation(move as Move, defaultGameState, legalMovesStore)).toBe(expected);
    });

    it('uses figurine notation when enabled', () => {
        const startIndex = algebraicNotationToIndex('g1');
        const endIndex = algebraicNotationToIndex('f3');
        const legalMovesStore = createLegalMovesStore('N', endIndex, [startIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('N'),
            type: 'standard',
        };

        expect(createAlgebraicNotation(move, figurineGameState, legalMovesStore, true)).toBe('\u265Ef3');
    });

    it('includes file disambiguation when no other piece shares the file', () => {
        const startIndex = algebraicNotationToIndex('a4');
        const competingIndex = algebraicNotationToIndex('c6');
        const endIndex = algebraicNotationToIndex('d4');
        const legalMovesStore = createLegalMovesStore('R', endIndex, [startIndex, competingIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('R'),
            type: 'standard',
        };
        const gameState: ChessGameState = { status: 'in-progress', check: 'black' };

        expect(createAlgebraicNotation(move, gameState, legalMovesStore)).toBe('Rad4+');
    });

    it('includes rank disambiguation when another piece shares the file', () => {
        const startIndex = algebraicNotationToIndex('c4');
        const competingIndex = algebraicNotationToIndex('c1');
        const endIndex = algebraicNotationToIndex('g8');
        const legalMovesStore = createLegalMovesStore('b', endIndex, [startIndex, competingIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('b'),
            type: 'standard',
        };

        expect(createAlgebraicNotation(move, defaultGameState, legalMovesStore)).toBe('B4g8');
    });

    it('includes both file and rank disambiguation, capture, and checkmate suffix', () => {
        const startIndex = algebraicNotationToIndex('d4');
        const sameFileIndex = algebraicNotationToIndex('d6');
        const sameRankIndex = algebraicNotationToIndex('f4');
        const endIndex = algebraicNotationToIndex('h8');
        const legalMovesStore = createLegalMovesStore('Q', endIndex, [startIndex, sameFileIndex, sameRankIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('Q'),
            type: 'capture',
            captureIndex: algebraicNotationToIndex('h8'),
        };
        const gameState: ChessGameState = { status: 'checkmate', check: 'black' };

        expect(createAlgebraicNotation(move, gameState, legalMovesStore)).toBe('Qd4xh8#');
    });

    it('appends promotion notation for pawn promotions', () => {
        const startIndex = algebraicNotationToIndex('e7');
        const endIndex = algebraicNotationToIndex('e8');
        const legalMovesStore = createLegalMovesStore('P', endIndex, [startIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('P'),
            type: 'standard',
            promotion: 'q',
        };

        expect(createAlgebraicNotation(move, defaultGameState, legalMovesStore)).toBe('e8=Q');
    });

    it('uses pawn file for standard captures and marks en passant', () => {
        const startIndex = algebraicNotationToIndex('e5');
        const endIndex = algebraicNotationToIndex('d6');
        const legalMovesStore = createLegalMovesStore('P', endIndex, [startIndex]);
        const move: Move = {
            startIndex,
            endIndex,
            piece: getPiece('P'),
            type: 'en-passant',
            captureIndex: algebraicNotationToIndex('d5'),
        };
        const gameState: ChessGameState = { status: 'in-progress', check: 'black' };

        expect(createAlgebraicNotation(move, gameState, legalMovesStore)).toBe('exd6+ e.p.');
    });
});

describe('createFEN', () => {
    it('creates the initial FEN string for a new game', () => {
        const board = createBoardFromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
        const state: ChessBoardState = {
            board,
            playerTurn: 'white',
            castleRightsByColor: {
                white: { short: true, long: true },
                black: { short: true, long: true },
            },
            enPassantTargetIndex: null,
            halfmoveClock: 0,
            fullmoveClock: 1,
        };

        expect(createFEN(state)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    });

    it('creates a FEN string with custom castling rights and en passant target', () => {
        const board = createBoardFromFEN('8/8/8/3P4/8/8/8/4k2K');
        const state: ChessBoardState = {
            board,
            playerTurn: 'black',
            castleRightsByColor: {
                white: { short: false, long: false },
                black: { short: true, long: false },
            },
            enPassantTargetIndex: algebraicNotationToIndex('e3'),
            halfmoveClock: 7,
            fullmoveClock: 42,
        };

        expect(createFEN(state)).toBe('8/8/8/3P4/8/8/8/4k2K b k e3 7 42');
    });

    it('uses "-" when no castling rights are available', () => {
        const board = createBoardFromFEN('8/8/8/8/8/8/8/4k2K');
        const state: ChessBoardState = {
            board,
            playerTurn: 'black',
            castleRightsByColor: {
                white: { short: false, long: false },
                black: { short: false, long: false },
            },
            enPassantTargetIndex: null,
            halfmoveClock: 12,
            fullmoveClock: 25,
        };

        expect(createFEN(state)).toBe('8/8/8/8/8/8/8/4k2K b - - 12 25');
    });
});

describe('isValidFEN', () => {
    const validPlacement = '8/8/8/8/8/8/8/4k2K';

    it.each([
        { scenario: 'initial game setup', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
        { scenario: 'custom position', fen: '8/8/8/3P4/8/8/8/4k2K b k - 12 34' },
        { scenario: 'with en passant target on correct rank', fen: `${validPlacement} b - e3 0 7` },
    ])('returns true for $scenario', ({ fen }) => {
        expect(isValidFEN(fen)).toBe(true);
    });

    it('rejects strings without six fields', () => {
        expect(isValidFEN(`${validPlacement} w - - 0`)).toBe(false);
    });

    it.each([
        { scenario: 'includes invalid characters', fen: '4k3/8/8/8/8/8/8/4x2K w - - 0 1' },
        { scenario: 'has fewer than eight ranks', fen: '8/8/8/8/8/8/8 w - - 0 1' },
        { scenario: 'overfills a rank', fen: 'Q8/8/8/8/8/8/8/4k2K w - - 0 1' },
        { scenario: 'underfills a rank', fen: '7/8/8/8/8/8/8/4k2K w - - 0 1' },
    ])('rejects invalid piece placement when it $scenario', ({ fen }) => {
        expect(isValidFEN(fen)).toBe(false);
    });

    it('rejects invalid active color flags', () => {
        expect(isValidFEN(`${validPlacement} x - - 0 1`)).toBe(false);
    });

    it('rejects invalid castling availability strings', () => {
        expect(isValidFEN(`${validPlacement} w KK - 0 1`)).toBe(false);
    });

    it('rejects malformed en passant targets', () => {
        expect(isValidFEN(`${validPlacement} w - e4 0 1`)).toBe(false);
    });

    it('rejects en passant targets on the wrong rank', () => {
        expect(isValidFEN(`${validPlacement} w - e3 0 1`)).toBe(false);
    });

    it('rejects non-numeric halfmove clocks', () => {
        expect(isValidFEN(`${validPlacement} w - - five 1`)).toBe(false);
    });

    it('rejects non-numeric fullmove clocks', () => {
        expect(isValidFEN(`${validPlacement} w - - 0 one`)).toBe(false);
    });

    it('rejects non-positive fullmove clocks', () => {
        expect(isValidFEN(`${validPlacement} w - - 0 0`)).toBe(false);
    });
});
