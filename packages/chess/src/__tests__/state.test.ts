import { IllegalMoveError } from '@grouchess/errors';

import { createInitialBoard } from '../board.js';
import { createInitialCastleRights } from '../castles.js';
import { computeForcedDrawStatus, createRepetitionKeyFromBoardState } from '../draws.js';
import { computeAllLegalMoves, isKingInCheck } from '../moves.js';
import { createAlgebraicNotation } from '../notations.js';
import type {
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    LegalMovesStore,
    Move,
    MoveRecord,
    PieceCapture,
    PositionCounts,
} from '../schema.js';
import {
    createChessGameFromFEN,
    createInitialBoardState,
    createInitialChessGame,
    computeGameStatus,
    computeNextChessGameAfterMove,
} from '../state.js';
import { createBoardStateFromFEN } from '../utils/fen.js';
import {
    getNextBoardStateAfterMove,
    getNextPositionCounts,
    getPieceCaptureFromMove,
    validatePromotion,
} from '../utils/moves.js';

vi.mock('../board.js', () => ({
    createInitialBoard: vi.fn(),
}));

vi.mock('../castles.js', () => ({
    createInitialCastleRights: vi.fn(),
}));

vi.mock('../draws.js', () => ({
    computeForcedDrawStatus: vi.fn(),
    createRepetitionKeyFromBoardState: vi.fn(),
}));

vi.mock('../moves.js', () => ({
    computeAllLegalMoves: vi.fn(),
    isKingInCheck: vi.fn(),
}));

vi.mock('../notations.js', () => ({
    createAlgebraicNotation: vi.fn(),
}));

vi.mock('../utils/fen.js', () => ({
    createBoardStateFromFEN: vi.fn(),
}));

vi.mock('../utils/moves.js', () => ({
    getNextBoardStateAfterMove: vi.fn(),
    getNextPositionCounts: vi.fn(),
    getPieceCaptureFromMove: vi.fn(),
    validatePromotion: vi.fn(),
}));

const createInitialBoardMock = vi.mocked(createInitialBoard);
const createInitialCastleRightsMock = vi.mocked(createInitialCastleRights);
const computeForcedDrawStatusMock = vi.mocked(computeForcedDrawStatus);
const createRepetitionKeyFromBoardStateMock = vi.mocked(createRepetitionKeyFromBoardState);
const computeAllLegalMovesMock = vi.mocked(computeAllLegalMoves);
const isKingInCheckMock = vi.mocked(isKingInCheck);
const createAlgebraicNotationMock = vi.mocked(createAlgebraicNotation);
const createBoardStateFromFENMock = vi.mocked(createBoardStateFromFEN);
const getNextBoardStateAfterMoveMock = vi.mocked(getNextBoardStateAfterMove);
const getNextPositionCountsMock = vi.mocked(getNextPositionCounts);
const getPieceCaptureFromMoveMock = vi.mocked(getPieceCaptureFromMove);
const validatePromotionMock = vi.mocked(validatePromotion);

const makeBoard = (): ChessBoardType => Array(64).fill(null) as ChessBoardType;

const makeBoardState = (overrides: Partial<ChessBoardState> = {}): ChessBoardState => ({
    board: makeBoard(),
    playerTurn: 'white',
    castleRightsByColor: {
        white: { short: true, long: true },
        black: { short: true, long: true },
    },
    enPassantTargetIndex: null,
    halfmoveClock: 0,
    fullmoveClock: 1,
    ...overrides,
});

const createLegalMovesStore = (moves: Move[] = []): LegalMovesStore => {
    const byStartIndex = moves.reduce<LegalMovesStore['byStartIndex']>((acc, move) => {
        const key = String(move.startIndex);
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(move);
        return acc;
    }, {});
    return {
        allMoves: moves,
        byStartIndex,
        typeAndEndIndexToStartIndex: {},
    };
};

let defaultBoard: ChessBoardType;
let defaultCastleRights: CastleRightsByColor;
let defaultLegalMovesStore: LegalMovesStore;

beforeEach(() => {
    vi.resetAllMocks();

    defaultBoard = makeBoard();
    defaultCastleRights = {
        white: { short: true, long: true },
        black: { short: true, long: true },
    };
    defaultLegalMovesStore = createLegalMovesStore();

    createInitialBoardMock.mockReturnValue(defaultBoard);
    createInitialCastleRightsMock.mockReturnValue(defaultCastleRights);
    computeForcedDrawStatusMock.mockReturnValue(null);
    computeAllLegalMovesMock.mockReturnValue(defaultLegalMovesStore);
    createRepetitionKeyFromBoardStateMock.mockReturnValue('initial-position-key');
});

describe('createInitialBoardState', () => {
    it('creates the default board state using the underlying factories', () => {
        const result = createInitialBoardState();

        expect(result).toEqual({
            board: defaultBoard,
            playerTurn: 'white',
            castleRightsByColor: defaultCastleRights,
            enPassantTargetIndex: null,
            halfmoveClock: 0,
            fullmoveClock: 1,
        });
        expect(createInitialBoardMock).toHaveBeenCalledTimes(1);
        expect(createInitialCastleRightsMock).toHaveBeenCalledTimes(1);
    });
});

describe('createInitialChessGame', () => {
    it('returns an in-progress game seeded with the initial board state', () => {
        const expectedBoardState = makeBoardState({
            board: defaultBoard,
            castleRightsByColor: defaultCastleRights,
        });
        createInitialBoardMock.mockReturnValueOnce(expectedBoardState.board);
        computeAllLegalMovesMock.mockReturnValueOnce(defaultLegalMovesStore);

        const game = createInitialChessGame();

        expect(game.boardState).toEqual(expectedBoardState);
        expect(game.gameState).toEqual({ status: 'in-progress' });
        expect(game.legalMovesStore).toBe(defaultLegalMovesStore);
        expect(game.moveHistory).toEqual([]);
        expect(game.captures).toEqual([]);
        expect(game.positionCounts).toEqual({ 'initial-position-key': 1 });
        expect(computeAllLegalMovesMock).toHaveBeenCalledWith(game.boardState);
        expect(createRepetitionKeyFromBoardStateMock).toHaveBeenCalledWith(game.boardState);
    });
});

describe('computeGameStatus', () => {
    it('returns checkmate when king is in check with no legal moves', () => {
        const board = makeBoard();
        const legalMovesStore = createLegalMovesStore();
        isKingInCheckMock.mockReturnValueOnce(true);
        computeForcedDrawStatusMock.mockReturnValueOnce(null);

        const result = computeGameStatus(board, 'white', 3, legalMovesStore, { key: 1 });

        expect(result).toEqual({
            status: 'checkmate',
            winner: 'black',
            check: 'white',
        });
        expect(computeForcedDrawStatusMock).not.toHaveBeenCalled();
    });

    it('awards checkmate to white when black is checkmated', () => {
        const board = makeBoard();
        const legalMovesStore = createLegalMovesStore();
        isKingInCheckMock.mockReturnValueOnce(true);
        computeForcedDrawStatusMock.mockReturnValueOnce(null);

        const result = computeGameStatus(board, 'black', 10, legalMovesStore, { key: 2 });

        expect(result).toEqual({
            status: 'checkmate',
            winner: 'white',
            check: 'black',
        });
        expect(computeForcedDrawStatusMock).not.toHaveBeenCalled();
    });

    it('returns the forced draw status when available', () => {
        const board = makeBoard();
        const legalMovesStore = createLegalMovesStore();
        isKingInCheckMock.mockReturnValueOnce(false);
        computeForcedDrawStatusMock.mockReturnValueOnce('stalemate');

        const result = computeGameStatus(board, 'black', 50, legalMovesStore, { another: 2 });

        expect(result).toEqual({ status: 'stalemate' });
    });

    it('flags check while the game remains in progress', () => {
        const board = makeBoard();
        const legalMovesStore = createLegalMovesStore([
            {
                startIndex: 12,
                endIndex: 20,
                type: 'standard',
                piece: { alias: 'P', color: 'white', type: 'pawn', value: 1 },
            },
        ]);
        isKingInCheckMock.mockReturnValueOnce(true);
        computeForcedDrawStatusMock.mockReturnValueOnce(null);

        const result = computeGameStatus(board, 'black', 5, legalMovesStore, { key: 3 });

        expect(result).toEqual({
            status: 'in-progress',
            check: 'black',
        });
    });

    it('remains in progress when no check or forced draw applies', () => {
        const board = makeBoard();
        const legalMovesStore = createLegalMovesStore([
            {
                startIndex: 10,
                endIndex: 18,
                type: 'standard',
                piece: { alias: 'N', color: 'white', type: 'knight', value: 3 },
            },
        ]);
        isKingInCheckMock.mockReturnValueOnce(false);
        computeForcedDrawStatusMock.mockReturnValueOnce(null);

        const result = computeGameStatus(board, 'white', 0, legalMovesStore, { key: 4 });

        expect(result).toEqual({ status: 'in-progress' });
    });
});

describe('computeNextChessGameAfterMove', () => {
    const createMove = (overrides: Partial<Move> = {}): Move => ({
        startIndex: 12,
        endIndex: 28,
        type: 'standard',
        piece: { alias: 'P', color: 'white', type: 'pawn', value: 1 },
        ...overrides,
    });

    const buildPrevGame = (overrides: Partial<ChessGame> = {}): ChessGame => {
        const legalMove = createMove();
        const legalMovesStore = createLegalMovesStore([legalMove]);
        const baseGame: ChessGame = {
            boardState: makeBoardState(),
            gameState: { status: 'in-progress' },
            legalMovesStore,
            moveHistory: [],
            captures: [],
            positionCounts: { key: 1 },
        };
        return {
            ...baseGame,
            ...overrides,
        };
    };

    it('computes the next game snapshot and appends captures', () => {
        const legalMove = createMove();
        const prevGame = buildPrevGame({
            legalMovesStore: createLegalMovesStore([legalMove]),
            moveHistory: [
                {
                    move: createMove({ startIndex: 8, endIndex: 16 }),
                    notation: { san: 'e4', figurine: '♙e4' },
                },
            ],
        });
        const incomingMove: Move = { ...legalMove, promotion: 'Q' };
        const nextBoardState = makeBoardState({ playerTurn: 'black', halfmoveClock: 1 });
        const nextLegalMovesStore = createLegalMovesStore([createMove({ startIndex: 52, endIndex: 36 })]);
        const nextPositionCounts: PositionCounts = { next: 1 };
        const pieceCapture: PieceCapture = {
            piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 },
            moveIndex: prevGame.moveHistory.length,
        };

        getPieceCaptureFromMoveMock.mockReturnValueOnce(pieceCapture);
        getNextBoardStateAfterMoveMock.mockReturnValueOnce(nextBoardState);
        computeAllLegalMovesMock.mockReturnValueOnce(nextLegalMovesStore);
        getNextPositionCountsMock.mockReturnValueOnce(nextPositionCounts);
        isKingInCheckMock.mockReturnValueOnce(true);
        createAlgebraicNotationMock.mockImplementation((_move, _gameStatus, _store, figurine) =>
            figurine ? 'figurine-notation' : 'san-notation'
        );

        const result = computeNextChessGameAfterMove(prevGame, incomingMove);

        expect(validatePromotionMock).toHaveBeenCalledWith({ ...legalMove, promotion: 'Q' });
        expect(getPieceCaptureFromMoveMock).toHaveBeenCalledWith(legalMove, prevGame.moveHistory.length);
        expect(getNextBoardStateAfterMoveMock).toHaveBeenCalledWith(prevGame.boardState, {
            ...legalMove,
            promotion: 'Q',
        });
        expect(computeAllLegalMovesMock).toHaveBeenCalledWith(nextBoardState);
        expect(getNextPositionCountsMock).toHaveBeenCalledWith(prevGame.positionCounts, nextBoardState);
        expect(isKingInCheckMock).toHaveBeenLastCalledWith(nextBoardState.board, nextBoardState.playerTurn);
        expect(computeForcedDrawStatusMock).toHaveBeenLastCalledWith(
            nextBoardState.board,
            false,
            nextBoardState.halfmoveClock,
            nextPositionCounts
        );
        expect(result.gameState).toEqual({ status: 'in-progress', check: 'black' });
        expect(createAlgebraicNotationMock).toHaveBeenCalledWith(
            incomingMove,
            result.gameState,
            prevGame.legalMovesStore
        );
        expect(createAlgebraicNotationMock).toHaveBeenCalledWith(
            incomingMove,
            result.gameState,
            prevGame.legalMovesStore,
            true
        );

        const expectedMoveRecord: MoveRecord = {
            move: incomingMove,
            notation: { san: 'san-notation', figurine: 'figurine-notation' },
        };

        expect(result).toEqual({
            boardState: nextBoardState,
            gameState: { status: 'in-progress', check: 'black' },
            legalMovesStore: nextLegalMovesStore,
            moveHistory: [...prevGame.moveHistory, expectedMoveRecord],
            captures: [pieceCapture],
            positionCounts: nextPositionCounts,
        });
    });

    it('throws when the move is not legal', () => {
        const prevGame = buildPrevGame({
            legalMovesStore: createLegalMovesStore([createMove({ startIndex: 0, endIndex: 2 })]),
        });

        expect(() =>
            computeNextChessGameAfterMove(
                prevGame,
                createMove({
                    startIndex: 0,
                    endIndex: 1,
                })
            )
        ).toThrow(IllegalMoveError);
        expect(validatePromotionMock).not.toHaveBeenCalled();
    });

    it('preserves the captures reference when no capture is produced', () => {
        const legalMove = createMove();
        const captures: PieceCapture[] = [
            {
                piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 },
                moveIndex: 0,
            },
        ];
        const prevGame = buildPrevGame({
            legalMovesStore: createLegalMovesStore([legalMove]),
            captures,
        });
        const incomingMove = legalMove;
        const nextBoardState = makeBoardState({ playerTurn: 'black' });
        const nextLegalMovesStore = createLegalMovesStore();
        const nextPositionCounts: PositionCounts = { next: 2 };

        getPieceCaptureFromMoveMock.mockReturnValueOnce(null);
        getNextBoardStateAfterMoveMock.mockReturnValueOnce(nextBoardState);
        computeAllLegalMovesMock.mockReturnValueOnce(nextLegalMovesStore);
        getNextPositionCountsMock.mockReturnValueOnce(nextPositionCounts);
        createAlgebraicNotationMock.mockReturnValue('san');

        const result = computeNextChessGameAfterMove(prevGame, incomingMove);

        expect(result.captures).toBe(captures);
        expect(result.gameState).toEqual({ status: 'in-progress' });
        expect(result.moveHistory.at(-1)).toEqual({
            move: incomingMove,
            notation: { san: 'san', figurine: 'san' },
        });
    });
});

describe('createChessGameFromFEN', () => {
    it('creates a game from the provided FEN string', () => {
        const fenBoardState = makeBoardState({ playerTurn: 'black', halfmoveClock: 7, fullmoveClock: 12 });
        const fenLegalMovesStore = createLegalMovesStore([
            {
                startIndex: 54,
                endIndex: 46,
                type: 'standard',
                piece: { alias: 'p', color: 'black', type: 'pawn', value: 1 },
            },
        ]);

        createBoardStateFromFENMock.mockReturnValueOnce(fenBoardState);
        computeAllLegalMovesMock.mockReturnValueOnce(fenLegalMovesStore);
        createRepetitionKeyFromBoardStateMock.mockReturnValueOnce('fen-key');

        const game = createChessGameFromFEN('fen-string');

        expect(createBoardStateFromFENMock).toHaveBeenCalledWith('fen-string');
        expect(game).toEqual({
            boardState: fenBoardState,
            captures: [],
            moveHistory: [],
            gameState: { status: 'in-progress' },
            legalMovesStore: fenLegalMovesStore,
            positionCounts: { 'fen-key': 1 },
        });
    });
});
