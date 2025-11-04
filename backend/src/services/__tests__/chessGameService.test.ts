import { computeNextChessGameAfterMove, createInitialChessGame } from '@grouchess/chess';
import type { ChessGameState, PawnPromotion } from '@grouchess/models';
import { createMockChessGame, createMockLegalMovesStore, createMockMove } from '@grouchess/test-utils';

import { GameNotStartedError, IllegalMoveError, InvalidChessGameStateError } from '../../utils/errors.js';
import { ChessGameService } from '../chessGameService.js';

vi.mock('@grouchess/chess', () => ({
    createInitialChessGame: vi.fn(),
    computeNextChessGameAfterMove: vi.fn(),
}));

const mockCreateInitialChessGame = vi.mocked(createInitialChessGame);
const mockComputeNextChessGameAfterMove = vi.mocked(computeNextChessGameAfterMove);

describe('ChessGameService.createChessGameForRoom', () => {
    it('creates and stores a new chess game for the room', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame();
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        const result = service.createChessGameForRoom('room-1');

        expect(mockCreateInitialChessGame).toHaveBeenCalledTimes(1);
        expect(result).toEqual(mockGame);
    });

    it('stores the game so it can be retrieved later', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame();
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');
        const retrieved = service.getChessGameForRoom('room-1');

        expect(retrieved).toEqual(mockGame);
    });

    it('creates separate games for different rooms', () => {
        const service = new ChessGameService();
        const mockGame1 = createMockChessGame();
        const mockGame2 = createMockChessGame({ boardState: { ...mockGame1.boardState, halfmoveClock: 5 } });

        mockCreateInitialChessGame.mockReturnValueOnce(mockGame1).mockReturnValueOnce(mockGame2);

        const result1 = service.createChessGameForRoom('room-1');
        const result2 = service.createChessGameForRoom('room-2');

        expect(result1).toEqual(mockGame1);
        expect(result2).toEqual(mockGame2);
        expect(result1).not.toEqual(result2);
    });
});

describe('ChessGameService.getChessGameForRoom', () => {
    it('returns undefined when no game exists for the room', () => {
        const service = new ChessGameService();

        const result = service.getChessGameForRoom('non-existent-room');

        expect(result).toBeUndefined();
    });

    it('returns a clone of the stored game', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame();
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');
        const retrieved = service.getChessGameForRoom('room-1');

        expect(retrieved).toEqual(mockGame);
        // Verify it's a clone, not the same reference
        expect(retrieved).not.toBe(mockGame);
    });

    it('returns a fresh clone on each call', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame();
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');
        const retrieved1 = service.getChessGameForRoom('room-1');
        const retrieved2 = service.getChessGameForRoom('room-1');

        expect(retrieved1).toEqual(retrieved2);
        expect(retrieved1).not.toBe(retrieved2);
    });
});

describe('ChessGameService.getInProgressChessGameForRoom', () => {
    it('returns the chess game when it exists and is in progress', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame({
            gameState: { status: 'in-progress' },
        });
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');
        const result = service.getInProgressChessGameForRoom('room-1');

        expect(result).toEqual(mockGame);
    });

    it('throws GameNotStartedError when no game exists for the room', () => {
        const service = new ChessGameService();

        expect(() => service.getInProgressChessGameForRoom('non-existent-room')).toThrow(GameNotStartedError);
    });

    it.each([
        {
            scenario: 'game is in checkmate status',
            gameState: { status: 'checkmate', winner: 'white' } as ChessGameState,
        },
        {
            scenario: 'game is in stalemate status',
            gameState: { status: 'stalemate' } as ChessGameState,
        },
        {
            scenario: 'game is in draw status',
            gameState: { status: 'draw-by-agreement' } as ChessGameState,
        },
        {
            scenario: 'game is in resignation status',
            gameState: { status: 'resigned', winner: 'black' } as ChessGameState,
        },
        {
            scenario: 'game is in timeout status',
            gameState: { status: 'time-out', winner: 'white' } as ChessGameState,
        },
    ])('throws InvalidChessGameStateError when $scenario', ({ gameState }) => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame({ gameState });
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');

        expect(() => service.getInProgressChessGameForRoom('room-1')).toThrow(InvalidChessGameStateError);
        expect(() => service.getInProgressChessGameForRoom('room-1')).toThrow('Game is not in progress');
    });
});

describe('ChessGameService.deleteChessGameForRoom', () => {
    it('removes the chess game for the specified room', () => {
        const service = new ChessGameService();
        const mockGame = createMockChessGame();
        mockCreateInitialChessGame.mockReturnValue(mockGame);

        service.createChessGameForRoom('room-1');
        expect(service.getChessGameForRoom('room-1')).toBeDefined();

        service.deleteChessGameForRoom('room-1');

        expect(service.getChessGameForRoom('room-1')).toBeUndefined();
    });

    it('does not affect other rooms', () => {
        const service = new ChessGameService();
        const mockGame1 = createMockChessGame();
        const mockGame2 = createMockChessGame();

        mockCreateInitialChessGame.mockReturnValueOnce(mockGame1).mockReturnValueOnce(mockGame2);

        service.createChessGameForRoom('room-1');
        service.createChessGameForRoom('room-2');

        service.deleteChessGameForRoom('room-1');

        expect(service.getChessGameForRoom('room-1')).toBeUndefined();
        expect(service.getChessGameForRoom('room-2')).toEqual(mockGame2);
    });

    it('does nothing when the room does not exist', () => {
        const service = new ChessGameService();

        // Should not throw
        expect(() => service.deleteChessGameForRoom('non-existent-room')).not.toThrow();
    });
});

describe('ChessGameService.movePiece', () => {
    it('executes a legal move and updates the game state', () => {
        const service = new ChessGameService();
        const fromIndex = 52; // e2
        const toIndex = 36; // e4

        const move = createMockMove({ startIndex: fromIndex, endIndex: toIndex });
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                [fromIndex]: [move],
            },
        });

        const initialGame = createMockChessGame({
            legalMovesStore,
            gameState: { status: 'in-progress' },
        });

        const nextGame = createMockChessGame({
            boardState: { ...initialGame.boardState, halfmoveClock: 1 },
            gameState: { status: 'in-progress' },
        });

        mockCreateInitialChessGame.mockReturnValue(initialGame);
        mockComputeNextChessGameAfterMove.mockReturnValue(nextGame);

        service.createChessGameForRoom('room-1');
        const result = service.movePiece('room-1', fromIndex, toIndex);

        expect(mockComputeNextChessGameAfterMove).toHaveBeenCalledWith(initialGame, move);
        expect(result).toEqual(nextGame);
        expect(service.getChessGameForRoom('room-1')).toEqual(nextGame);
    });

    it('executes a move with pawn promotion', () => {
        const service = new ChessGameService();
        const fromIndex = 8;
        const toIndex = 0;
        const promotion: PawnPromotion = 'q';

        const move = createMockMove({ startIndex: fromIndex, endIndex: toIndex });
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                [fromIndex]: [move],
            },
        });

        const initialGame = createMockChessGame({ legalMovesStore });
        const nextGame = createMockChessGame();

        mockCreateInitialChessGame.mockReturnValue(initialGame);
        mockComputeNextChessGameAfterMove.mockReturnValue(nextGame);

        service.createChessGameForRoom('room-1');
        const result = service.movePiece('room-1', fromIndex, toIndex, promotion);

        expect(mockComputeNextChessGameAfterMove).toHaveBeenCalledWith(initialGame, { ...move, promotion });
        expect(result).toEqual(nextGame);
    });

    it('throws GameNotStartedError when no game exists for the room', () => {
        const service = new ChessGameService();

        expect(() => service.movePiece('non-existent-room', 52, 36)).toThrow(GameNotStartedError);
    });

    it('throws IllegalMoveError when the from index has no legal moves', () => {
        const service = new ChessGameService();
        const fromIndex = 52;
        const toIndex = 36;

        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {}, // No legal moves at all
        });

        const initialGame = createMockChessGame({ legalMovesStore });
        mockCreateInitialChessGame.mockReturnValue(initialGame);

        service.createChessGameForRoom('room-1');

        expect(() => service.movePiece('room-1', fromIndex, toIndex)).toThrow(IllegalMoveError);
    });

    it('throws IllegalMoveError when the to index is not a legal destination', () => {
        const service = new ChessGameService();
        const fromIndex = 52; // e2
        const toIndex = 28; // e5 (illegal - pawn can't move 3 squares)

        const move = createMockMove({ startIndex: fromIndex, endIndex: 36 }); // only e4 is legal
        const legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                [fromIndex]: [move],
            },
        });

        const initialGame = createMockChessGame({ legalMovesStore });
        mockCreateInitialChessGame.mockReturnValue(initialGame);

        service.createChessGameForRoom('room-1');

        expect(() => service.movePiece('room-1', fromIndex, toIndex)).toThrow(IllegalMoveError);
    });
});

describe('ChessGameService.endGameForRoom', () => {
    it('updates the game state to the provided end state', () => {
        const service = new ChessGameService();
        const initialGame = createMockChessGame({
            gameState: { status: 'in-progress' },
        });
        const endState: ChessGameState = { status: 'checkmate', winner: 'white' };

        mockCreateInitialChessGame.mockReturnValue(initialGame);

        service.createChessGameForRoom('room-1');
        const result = service.endGameForRoom('room-1', endState);

        expect(result.gameState).toEqual(endState);
        expect(service.getChessGameForRoom('room-1')?.gameState).toEqual(endState);
    });

    it.each([
        {
            scenario: 'game ends in checkmate',
            endState: { status: 'checkmate', winner: 'black' } as ChessGameState,
        },
        {
            scenario: 'game ends in stalemate',
            endState: { status: 'stalemate' } as ChessGameState,
        },
        {
            scenario: 'game ends in draw',
            endState: { status: 'draw-by-agreement' } as ChessGameState,
        },
        {
            scenario: 'game ends in resignation',
            endState: { status: 'resigned', winner: 'white' } as ChessGameState,
        },
        {
            scenario: 'game ends in timeout',
            endState: { status: 'time-out', winner: 'black' } as ChessGameState,
        },
    ])('correctly handles when $scenario', ({ endState }) => {
        const service = new ChessGameService();
        const initialGame = createMockChessGame({
            gameState: { status: 'in-progress' },
        });

        mockCreateInitialChessGame.mockReturnValue(initialGame);

        service.createChessGameForRoom('room-1');
        const result = service.endGameForRoom('room-1', endState);

        expect(result.gameState).toEqual(endState);
    });

    it('throws GameNotStartedError when no game exists for the room', () => {
        const service = new ChessGameService();
        const endState: ChessGameState = { status: 'resigned', winner: 'white' };

        expect(() => service.endGameForRoom('non-existent-room', endState)).toThrow(GameNotStartedError);
    });

    it('throws InvalidChessGameStateError when game is already ended', () => {
        const service = new ChessGameService();
        const initialGame = createMockChessGame({
            gameState: { status: 'checkmate', winner: 'white' },
        });
        const endState: ChessGameState = { status: 'resigned', winner: 'black' };

        mockCreateInitialChessGame.mockReturnValue(initialGame);

        service.createChessGameForRoom('room-1');

        expect(() => service.endGameForRoom('room-1', endState)).toThrow(InvalidChessGameStateError);
    });
});
