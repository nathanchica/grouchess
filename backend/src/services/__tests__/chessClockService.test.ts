import {
    createInitialChessClockState,
    createUpdatedClockState,
    createPausedClockState,
    createStartedClockState,
} from '@grouchess/chess-clocks';
import { createMockChessClockState, createMockTimeControl } from '@grouchess/test-utils';

import { ChessClockService } from '../chessClockService.js';

vi.mock('@grouchess/chess-clocks', () => ({
    createInitialChessClockState: vi.fn(),
    createUpdatedClockState: vi.fn(),
    createPausedClockState: vi.fn(),
    createStartedClockState: vi.fn(),
}));

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ChessClockService.initializeClockForRoom', () => {
    it('creates initial clock state and stores it in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl({ minutes: 5, increment: 3 });
        const mockClockState = createMockChessClockState({ baseTimeMs: 300000, incrementMs: 3000 });

        vi.mocked(createInitialChessClockState).mockReturnValue(mockClockState);

        const result = service.initializeClockForRoom(roomId, timeControl);

        expect(createInitialChessClockState).toHaveBeenCalledWith(timeControl);
        expect(result).toEqual(mockClockState);
        expect(service.hasClockForRoom(roomId)).toBe(true);
    });
});

describe('ChessClockService.hasClockForRoom', () => {
    it('returns true when clock exists for room', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const mockClockState = createMockChessClockState();

        vi.mocked(createInitialChessClockState).mockReturnValue(mockClockState);
        service.initializeClockForRoom(roomId, timeControl);

        expect(service.hasClockForRoom(roomId)).toBe(true);
    });

    it('returns false when clock does not exist for room', () => {
        const service = new ChessClockService();

        expect(service.hasClockForRoom('non-existent-room')).toBe(false);
    });
});

describe('ChessClockService.getClockStateForRoom', () => {
    it('returns null when clock does not exist for room', () => {
        const service = new ChessClockService();

        const result = service.getClockStateForRoom('non-existent-room');

        expect(result).toBeNull();
        expect(createUpdatedClockState).not.toHaveBeenCalled();
    });

    it('returns updated clock state when clock exists', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const initialClockState = createMockChessClockState({ baseTimeMs: 600000 });
        const updatedClockState = createMockChessClockState({
            baseTimeMs: 600000,
            white: { timeRemainingMs: 580000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(initialClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.getClockStateForRoom(roomId);

        expect(createUpdatedClockState).toHaveBeenCalledWith(initialClockState, expect.any(Number));
        expect(result).toEqual(updatedClockState);
    });

    it('stores the updated clock state in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const initialClockState = createMockChessClockState();
        const firstUpdate = createMockChessClockState({
            white: { timeRemainingMs: 590000, isActive: true },
        });
        const secondUpdate = createMockChessClockState({
            white: { timeRemainingMs: 580000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(initialClockState);
        vi.mocked(createUpdatedClockState).mockReturnValueOnce(firstUpdate).mockReturnValueOnce(secondUpdate);

        service.initializeClockForRoom(roomId, timeControl);
        service.getClockStateForRoom(roomId);
        service.getClockStateForRoom(roomId);

        // Second call should use the firstUpdate as input, not the initial state
        expect(createUpdatedClockState).toHaveBeenCalledTimes(2);
        expect(createUpdatedClockState).toHaveBeenNthCalledWith(1, initialClockState, expect.any(Number));
        expect(createUpdatedClockState).toHaveBeenNthCalledWith(2, firstUpdate, expect.any(Number));
    });
});

describe('ChessClockService.deleteClockForRoom', () => {
    it('removes clock from the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const mockClockState = createMockChessClockState();

        vi.mocked(createInitialChessClockState).mockReturnValue(mockClockState);
        service.initializeClockForRoom(roomId, timeControl);

        expect(service.hasClockForRoom(roomId)).toBe(true);

        service.deleteClockForRoom(roomId);

        expect(service.hasClockForRoom(roomId)).toBe(false);
    });

    it('does not throw when deleting non-existent clock', () => {
        const service = new ChessClockService();

        expect(() => service.deleteClockForRoom('non-existent-room')).not.toThrow();
    });
});

describe('ChessClockService.switchClock', () => {
    it('throws error when clock is not initialized', () => {
        const service = new ChessClockService();

        expect(() => service.switchClock('non-existent-room', 'white')).toThrow('Clock not initialized for this room');
    });

    it('throws error when clock is paused', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const pausedClockState = createMockChessClockState({ isPaused: true });

        vi.mocked(createInitialChessClockState).mockReturnValue(pausedClockState);
        service.initializeClockForRoom(roomId, timeControl);

        expect(() => service.switchClock(roomId, 'black')).toThrow('Cannot switch clock while paused');
    });

    it('switches clock to specified color and returns updated state', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 600000, isActive: true },
            black: { timeRemainingMs: 600000, isActive: false },
        });
        const switchedClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 580000, isActive: false },
            black: { timeRemainingMs: 600000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(switchedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.switchClock(roomId, 'black');

        expect(createUpdatedClockState).toHaveBeenCalledWith(activeClockState, expect.any(Number), 'black');
        expect(result).toEqual(switchedClockState);
    });

    it('stores the switched clock state in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 600000, isActive: true },
            black: { timeRemainingMs: 600000, isActive: false },
        });
        const switchedClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 580000, isActive: false },
            black: { timeRemainingMs: 600000, isActive: true },
        });
        const updatedAgain = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 580000, isActive: false },
            black: { timeRemainingMs: 590000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValueOnce(switchedClockState).mockReturnValueOnce(updatedAgain);

        service.initializeClockForRoom(roomId, timeControl);
        service.switchClock(roomId, 'black');
        service.getClockStateForRoom(roomId);

        // The getClockStateForRoom call should use the switched state
        expect(createUpdatedClockState).toHaveBeenNthCalledWith(2, switchedClockState, expect.any(Number));
    });
});

describe('ChessClockService.pauseClock', () => {
    it('throws error when clock is not initialized', () => {
        const service = new ChessClockService();

        expect(() => service.pauseClock('non-existent-room')).toThrow('Clock not initialized for this room');
    });

    it('pauses the clock and returns paused state', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 600000, isActive: true },
        });
        const updatedClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 590000, isActive: true },
        });
        const pausedClockState = createMockChessClockState({
            isPaused: true,
            white: { timeRemainingMs: 590000, isActive: false },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);
        vi.mocked(createPausedClockState).mockReturnValue(pausedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.pauseClock(roomId);

        expect(createPausedClockState).toHaveBeenCalledWith(updatedClockState);
        expect(result).toEqual(pausedClockState);
    });

    it('stores the paused clock state in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({ isPaused: false });
        const updatedClockState = createMockChessClockState({ isPaused: false });
        const pausedClockState = createMockChessClockState({ isPaused: true });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);
        vi.mocked(createPausedClockState).mockReturnValue(pausedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        service.pauseClock(roomId);

        expect(service.hasClockForRoom(roomId)).toBe(true);
        // Verify the paused state was stored by checking it can't be switched
        expect(() => service.switchClock(roomId, 'white')).toThrow('Cannot switch clock while paused');
    });
});

describe('ChessClockService.startClock', () => {
    it('throws error when clock is not initialized', () => {
        const service = new ChessClockService();

        expect(() => service.startClock('non-existent-room', 'white')).toThrow('Clock not initialized for this room');
    });

    it('starts the clock with specified active color', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const pausedClockState = createMockChessClockState({ isPaused: true });
        const updatedClockState = createMockChessClockState({ isPaused: true });
        const startedClockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 600000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(pausedClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);
        vi.mocked(createStartedClockState).mockReturnValue(startedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.startClock(roomId, 'white');

        expect(createStartedClockState).toHaveBeenCalledWith(updatedClockState, 'white', expect.any(Number), undefined);
        expect(result).toEqual(startedClockState);
    });

    it('starts the clock with active color and increment color', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const pausedClockState = createMockChessClockState({ isPaused: true });
        const updatedClockState = createMockChessClockState({ isPaused: true });
        const startedClockState = createMockChessClockState({
            isPaused: false,
            black: { timeRemainingMs: 600000, isActive: true },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(pausedClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);
        vi.mocked(createStartedClockState).mockReturnValue(startedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.startClock(roomId, 'black', 'white');

        expect(createStartedClockState).toHaveBeenCalledWith(updatedClockState, 'black', expect.any(Number), 'white');
        expect(result).toEqual(startedClockState);
    });

    it('stores the started clock state in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const pausedClockState = createMockChessClockState({ isPaused: true });
        const updatedClockState = createMockChessClockState({ isPaused: true });
        const startedClockState = createMockChessClockState({ isPaused: false });

        vi.mocked(createInitialChessClockState).mockReturnValue(pausedClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);
        vi.mocked(createStartedClockState).mockReturnValue(startedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        service.startClock(roomId, 'white');

        expect(service.hasClockForRoom(roomId)).toBe(true);
        // Verify the started state was stored - it should not be paused anymore
        expect(() => service.switchClock(roomId, 'black')).not.toThrow('Cannot switch clock while paused');
    });
});

describe('ChessClockService.resetClock', () => {
    it('throws error when clock is not initialized', () => {
        const service = new ChessClockService();

        expect(() => service.resetClock('non-existent-room')).toThrow('Clock not initialized for this room');
    });

    it('resets clock to initial time with both sides inactive and paused', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({
            baseTimeMs: 600000,
            incrementMs: 3000,
            isPaused: false,
            white: { timeRemainingMs: 450000, isActive: true },
            black: { timeRemainingMs: 380000, isActive: false },
        });
        const updatedClockState = createMockChessClockState({
            baseTimeMs: 600000,
            incrementMs: 3000,
            isPaused: false,
            white: { timeRemainingMs: 440000, isActive: true },
            black: { timeRemainingMs: 380000, isActive: false },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        const result = service.resetClock(roomId);

        expect(result).toEqual({
            white: {
                timeRemainingMs: 600000,
                isActive: false,
            },
            black: {
                timeRemainingMs: 600000,
                isActive: false,
            },
            lastUpdatedTimeMs: null,
            baseTimeMs: 600000,
            incrementMs: 3000,
            isPaused: true,
        });
    });

    it('stores the reset clock state in the map', () => {
        const service = new ChessClockService();
        const roomId = 'room-123';
        const timeControl = createMockTimeControl();
        const activeClockState = createMockChessClockState({
            baseTimeMs: 300000,
            isPaused: false,
            white: { timeRemainingMs: 150000, isActive: false },
        });
        const updatedClockState = createMockChessClockState({
            baseTimeMs: 300000,
            isPaused: false,
            white: { timeRemainingMs: 150000, isActive: false },
        });

        vi.mocked(createInitialChessClockState).mockReturnValue(activeClockState);
        vi.mocked(createUpdatedClockState).mockReturnValue(updatedClockState);

        service.initializeClockForRoom(roomId, timeControl);
        service.resetClock(roomId);

        expect(service.hasClockForRoom(roomId)).toBe(true);
        // Verify the reset state was stored - it should be paused
        expect(() => service.switchClock(roomId, 'white')).toThrow('Cannot switch clock while paused');
    });
});
