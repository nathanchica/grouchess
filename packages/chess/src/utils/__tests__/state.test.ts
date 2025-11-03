import * as boardModule from '../../board.js';
import * as castlesModule from '../../castles.js';
import * as drawsModule from '../../draws.js';
import * as chessMovesModule from '../../moves.js';
import type {
    ChessBoardState,
    ChessBoardType,
    CastleRightsByColor,
    Piece,
    PieceCapture,
    PositionCounts,
    Move,
} from '../../schema.js';
import {
    getNextBoardStateAfterMove,
    getNextCastleRightsAfterMove,
    getNextPositionCounts,
    getPieceCaptureFromMove,
} from '../state.js';

const createPiece = (overrides: Partial<Piece> = {}): Piece =>
    ({
        alias: 'P',
        color: 'white',
        type: 'pawn',
        value: 1,
        ...overrides,
    }) as Piece;

const createMove = (overrides: Partial<Move> = {}): Move =>
    ({
        startIndex: 8,
        endIndex: 16,
        type: 'standard',
        piece: createPiece(),
        ...overrides,
    }) as Move;

const createBoard = (): ChessBoardType => Array.from({ length: 64 }, () => null);

const createBoardState = (overrides: Partial<ChessBoardState> = {}): ChessBoardState =>
    ({
        board: createBoard(),
        playerTurn: 'white',
        castleRightsByColor: {
            white: { short: true, long: true },
            black: { short: true, long: true },
        },
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
        ...overrides,
    }) as ChessBoardState;

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getPieceCaptureFromMove', () => {
    it.each([
        { scenario: 'regular capture', moveType: 'capture' as Move['type'] },
        { scenario: 'en passant capture', moveType: 'en-passant' as Move['type'] },
    ])('returns capture details for $scenario', ({ moveType }) => {
        const capturedPiece = createPiece({ alias: 'p', color: 'black' });
        const move = createMove({
            type: moveType,
            capturedPiece,
        });
        const expectedCapture: PieceCapture = { piece: capturedPiece, moveIndex: 3 };

        const result = getPieceCaptureFromMove(move, 3);

        expect(result).toEqual(expectedCapture);
    });

    it('throws when a capture move is missing the captured piece', () => {
        const move = createMove({ type: 'capture', capturedPiece: undefined });

        expect(() => getPieceCaptureFromMove(move, 5)).toThrow(/expected to have a capturedPiece/);
    });

    it('returns null for non-capturing moves', () => {
        const move = createMove({ type: 'standard' });

        expect(getPieceCaptureFromMove(move, 0)).toBeNull();
    });
});

describe('getNextPositionCounts', () => {
    it.each([
        {
            scenario: 'clears counts after a reset halfmove clock',
            halfmoveClock: 0,
            previousCounts: { old: 2 },
            expectedCounts: { 'key-1': 1 },
        },
        {
            scenario: 'increments existing position count',
            halfmoveClock: 4,
            previousCounts: { 'key-2': 2 },
            expectedCounts: { 'key-2': 3 },
        },
        {
            scenario: 'initializes count when position has not been seen',
            halfmoveClock: 2,
            previousCounts: {},
            expectedCounts: { 'key-3': 1 },
        },
    ])('computes next position counts when $scenario', ({ halfmoveClock, previousCounts, expectedCounts }) => {
        const keys = Object.keys(expectedCounts);
        const keyToReturn = keys[0];
        vi.spyOn(drawsModule, 'createRepetitionKeyFromBoardState').mockReturnValue(keyToReturn);
        const boardState = createBoardState({ halfmoveClock });

        const result = getNextPositionCounts(previousCounts as PositionCounts, boardState);

        expect(drawsModule.createRepetitionKeyFromBoardState).toHaveBeenCalledWith(boardState);
        expect(result).toEqual(expectedCounts);
    });
});

describe('getNextCastleRightsAfterMove', () => {
    it('merges castle-right changes into the previous rights', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: true, long: true },
            black: { short: false, long: true },
        };
        const diff = {
            white: { short: false },
            black: { long: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(diff);

        const move = createMove();
        const result = getNextCastleRightsAfterMove(prevRights, move);

        expect(castlesModule.computeCastleRightsChangesFromMove).toHaveBeenCalledWith(move);
        expect(result).toEqual({
            white: { short: false, long: true },
            black: { short: false, long: false },
        });
    });

    it('falls back to previous rights when white has no updates', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: false, long: true },
            black: { short: true, long: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue({
            black: { short: false },
        });

        const result = getNextCastleRightsAfterMove(prevRights, createMove());

        expect(result).toEqual({
            white: { short: false, long: true },
            black: { short: false, long: false },
        });
    });

    it('falls back to previous rights when black has no updates', () => {
        const prevRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: false, long: true },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue({
            white: { short: false },
        });

        const result = getNextCastleRightsAfterMove(prevRights, createMove());

        expect(result).toEqual({
            white: { short: false, long: false },
            black: { short: false, long: true },
        });
    });
});

describe('getNextBoardStateAfterMove', () => {
    it('computes the next state for a pawn move and resets counters', () => {
        const prevCastleRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: true, long: true },
        };
        const prevState = createBoardState({
            board: createBoard(),
            playerTurn: 'white',
            castleRightsByColor: prevCastleRights,
            halfmoveClock: 5,
            fullmoveClock: 7,
        });
        const move = createMove({
            startIndex: 8,
            endIndex: 16,
            type: 'standard',
            piece: createPiece({ type: 'pawn', color: 'white', alias: 'P' }),
        });
        const computedBoard = createBoard();
        vi.spyOn(chessMovesModule, 'computeNextChessBoardFromMove').mockReturnValue(computedBoard);
        vi.spyOn(boardModule, 'computeEnPassantTargetIndex').mockReturnValue(12);
        const rightsDiff = {
            white: {},
            black: { short: false },
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(rightsDiff);
        const expectedCastleRights: CastleRightsByColor = {
            white: { short: true, long: false },
            black: { short: false, long: true },
        };

        const result = getNextBoardStateAfterMove(prevState, move);

        expect(chessMovesModule.computeNextChessBoardFromMove).toHaveBeenCalledWith(prevState.board, move);
        expect(castlesModule.computeCastleRightsChangesFromMove).toHaveBeenCalledWith(move);
        expect(boardModule.computeEnPassantTargetIndex).toHaveBeenCalledWith(move.startIndex, move.endIndex);
        expect(result).toEqual<ChessBoardState>({
            board: computedBoard,
            playerTurn: 'black',
            castleRightsByColor: expectedCastleRights,
            enPassantTargetIndex: 12,
            halfmoveClock: 0,
            fullmoveClock: 7,
        });
    });

    it('increments clocks and omits en-passant target for non-pawn, non-capture moves', () => {
        const prevCastleRights: CastleRightsByColor = {
            white: { short: false, long: false },
            black: { short: true, long: false },
        };
        const prevState = createBoardState({
            board: createBoard(),
            playerTurn: 'black',
            castleRightsByColor: prevCastleRights,
            halfmoveClock: 3,
            fullmoveClock: 10,
        });
        const move = createMove({
            type: 'standard',
            piece: createPiece({ type: 'knight', alias: 'N', value: 3 }),
        });
        const computedBoard = createBoard();
        vi.spyOn(chessMovesModule, 'computeNextChessBoardFromMove').mockReturnValue(computedBoard);
        const enPassantSpy = vi.spyOn(boardModule, 'computeEnPassantTargetIndex');
        const rightsDiff = {
            white: {},
            black: {},
        };
        vi.spyOn(castlesModule, 'computeCastleRightsChangesFromMove').mockReturnValue(rightsDiff);
        const expectedCastleRights: CastleRightsByColor = {
            white: { short: false, long: false },
            black: { short: true, long: false },
        };

        const result = getNextBoardStateAfterMove(prevState, move);

        expect(enPassantSpy).not.toHaveBeenCalled();
        expect(result).toEqual<ChessBoardState>({
            board: computedBoard,
            playerTurn: 'white',
            castleRightsByColor: expectedCastleRights,
            enPassantTargetIndex: null,
            halfmoveClock: 4,
            fullmoveClock: 11,
        });
    });
});
