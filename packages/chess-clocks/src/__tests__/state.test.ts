import { hasInsufficientMatingMaterial } from '@grouchess/chess';
import { InvalidInputError } from '@grouchess/errors';
import { createMockTimeControl, createMockChessBoard } from '@grouchess/test-utils';

vi.mock('@grouchess/chess', async () => {
    const actual = await vi.importActual<typeof import('@grouchess/chess')>('@grouchess/chess');
    return {
        ...actual,
        hasInsufficientMatingMaterial: vi.fn(),
    };
});

import {
    createInitialChessClockState,
    createPausedClockState,
    createStartedClockState,
    createUpdatedClockState,
    computeGameStateBasedOnClock,
    MS_PER_MINUTE,
    MS_PER_SECOND,
    validateClockState,
} from '../state.js';

afterEach(() => {
    vi.resetAllMocks();
});

const buildPausedState = () =>
    createInitialChessClockState(createMockTimeControl({ alias: '5|3', minutes: 5, increment: 3, displayText: '5|3' }));
const buildRunningState = () => {
    const base = buildPausedState();
    return {
        ...base,
        isPaused: false,
        lastUpdatedTimeMs: 1_000,
        white: { ...base.white, isActive: true },
        black: { ...base.black, isActive: false },
    };
};

describe('createInitialChessClockState', () => {
    it('initializes both clocks with the same base time and paused state', () => {
        const timeControl = createMockTimeControl({ alias: '5|3', minutes: 5, increment: 3, displayText: '5|3' });

        const state = createInitialChessClockState(timeControl);

        expect(state.white.timeRemainingMs).toBe(timeControl.minutes * MS_PER_MINUTE);
        expect(state.black.timeRemainingMs).toBe(timeControl.minutes * MS_PER_MINUTE);
        expect(state.white.isActive).toBe(false);
        expect(state.black.isActive).toBe(false);
        expect(state.baseTimeMs).toBe(timeControl.minutes * MS_PER_MINUTE);
        expect(state.incrementMs).toBe(timeControl.increment * MS_PER_SECOND);
        expect(state.isPaused).toBe(true);
        expect(state.lastUpdatedTimeMs).toBeNull();
    });

    it('supports zero base time and increment values', () => {
        const timeControl = createMockTimeControl({ alias: '0|0', minutes: 0, increment: 0, displayText: '0|0' });

        const state = createInitialChessClockState(timeControl);

        expect(state.white.timeRemainingMs).toBe(0);
        expect(state.black.timeRemainingMs).toBe(0);
        expect(state.baseTimeMs).toBe(0);
        expect(state.incrementMs).toBe(0);
    });
});

describe('validateClockState', () => {
    it.each([
        { scenario: 'a paused state with null lastUpdatedTimeMs', buildState: buildPausedState },
        { scenario: 'a running state with exactly one active player', buildState: buildRunningState },
    ])('accepts $scenario', ({ buildState }) => {
        expect(() => validateClockState(buildState())).not.toThrow();
    });

    it.each([
        {
            scenario: 'white has negative time remaining',
            buildState: () => {
                const base = buildPausedState();
                return {
                    ...base,
                    white: { ...base.white, timeRemainingMs: -1 },
                };
            },
        },
        {
            scenario: 'black has negative time remaining',
            buildState: () => {
                const base = buildPausedState();
                return {
                    ...base,
                    black: { ...base.black, timeRemainingMs: -1 },
                };
            },
        },
        {
            scenario: 'baseTimeMs is negative',
            buildState: () => ({
                ...buildPausedState(),
                baseTimeMs: -1,
            }),
        },
        {
            scenario: 'incrementMs is negative',
            buildState: () => ({
                ...buildPausedState(),
                incrementMs: -1,
            }),
        },
        {
            scenario: 'paused but lastUpdatedTimeMs is not null',
            buildState: () => ({
                ...buildPausedState(),
                lastUpdatedTimeMs: 1_000,
            }),
        },
        {
            scenario: 'running but lastUpdatedTimeMs is null',
            buildState: () => {
                const base = buildRunningState();
                return {
                    ...base,
                    lastUpdatedTimeMs: null,
                };
            },
        },
        {
            scenario: 'running with no active players',
            buildState: () => {
                const base = buildRunningState();
                return {
                    ...base,
                    white: { ...base.white, isActive: false },
                };
            },
        },
        {
            scenario: 'running with both players active',
            buildState: () => {
                const base = buildRunningState();
                return {
                    ...base,
                    black: { ...base.black, isActive: true },
                };
            },
        },
    ])('throws when $scenario', ({ buildState }) => {
        expect(() => validateClockState(buildState())).toThrow(InvalidInputError);
    });
});

describe('createStartedClockState', () => {
    const nowMs = 10_000;

    it('unpauses the clock and activates the chosen player', () => {
        const base = buildPausedState();

        const started = createStartedClockState(base, 'white', nowMs);

        expect(started.isPaused).toBe(false);
        expect(started.lastUpdatedTimeMs).toBe(nowMs);
        expect(started.white.isActive).toBe(true);
        expect(started.black.isActive).toBe(false);
        expect(started.white.timeRemainingMs).toBe(base.white.timeRemainingMs);
        expect(started.black.timeRemainingMs).toBe(base.black.timeRemainingMs);

        expect(base.isPaused).toBe(true);
        expect(base.lastUpdatedTimeMs).toBeNull();
        expect(base.white.isActive).toBe(false);
        expect(base.black.isActive).toBe(false);
    });

    it('adds increment to the specified color when provided', () => {
        const base = buildPausedState();

        const started = createStartedClockState(base, 'black', nowMs, 'black');

        expect(started.black.timeRemainingMs).toBe(base.black.timeRemainingMs + base.incrementMs);
        expect(started.white.timeRemainingMs).toBe(base.white.timeRemainingMs);
        expect(started.black.isActive).toBe(true);
        expect(started.white.isActive).toBe(false);
    });

    it('can add increment to a different color than the active player', () => {
        const base = buildPausedState();

        const started = createStartedClockState(base, 'black', nowMs, 'white');

        expect(started.white.timeRemainingMs).toBe(base.white.timeRemainingMs + base.incrementMs);
        expect(started.black.timeRemainingMs).toBe(base.black.timeRemainingMs);
        expect(started.black.isActive).toBe(true);
        expect(started.white.isActive).toBe(false);
    });

    it('throws when provided an invalid clock state', () => {
        const base = buildPausedState();
        const invalid = {
            ...base,
            white: { ...base.white, timeRemainingMs: -1 },
        };

        expect(() => createStartedClockState(invalid, 'white', nowMs)).toThrow(InvalidInputError);
    });
});

describe('createPausedClockState', () => {
    it('pauses a running clock and clears lastUpdatedTimeMs', () => {
        const running = buildRunningState();

        const paused = createPausedClockState(running);

        expect(paused.isPaused).toBe(true);
        expect(paused.lastUpdatedTimeMs).toBeNull();
        expect(paused.white.isActive).toBe(running.white.isActive);
        expect(paused.black.isActive).toBe(running.black.isActive);
        expect(paused.white.timeRemainingMs).toBe(running.white.timeRemainingMs);
        expect(paused.black.timeRemainingMs).toBe(running.black.timeRemainingMs);
        expect(paused).not.toBe(running);
    });

    it('returns a paused clock unchanged when already paused', () => {
        const pausedState = buildPausedState();

        const result = createPausedClockState(pausedState);

        expect(result.isPaused).toBe(true);
        expect(result.lastUpdatedTimeMs).toBeNull();
        expect(result.white).toEqual(pausedState.white);
        expect(result.black).toEqual(pausedState.black);
    });

    it('throws when provided an invalid clock state', () => {
        const invalid = {
            ...buildRunningState(),
            baseTimeMs: -1,
        };

        expect(() => createPausedClockState(invalid)).toThrow(InvalidInputError);
    });
});

describe('createUpdatedClockState', () => {
    it('updates the active player time and lastUpdatedTimeMs', () => {
        const base = buildRunningState();
        const running = {
            ...base,
            lastUpdatedTimeMs: 5_000,
            white: { ...base.white, timeRemainingMs: 10_000 },
            black: { ...base.black, timeRemainingMs: 20_000 },
        };

        const updated = createUpdatedClockState(running, 7_000);

        expect(updated.white.timeRemainingMs).toBe(8_000);
        expect(updated.black.timeRemainingMs).toBe(20_000);
        expect(updated.lastUpdatedTimeMs).toBe(7_000);
        expect(updated.white.isActive).toBe(true);
        expect(updated.black.isActive).toBe(false);
        expect(updated).not.toBe(running);
    });

    it('clamps the remaining time to zero when elapsed time exceeds remaining', () => {
        const base = buildRunningState();
        const running = {
            ...base,
            lastUpdatedTimeMs: 1_000,
            white: { ...base.white, timeRemainingMs: 1_000 },
        };

        const updated = createUpdatedClockState(running, 5_500);

        expect(updated.white.timeRemainingMs).toBe(0);
        expect(updated.lastUpdatedTimeMs).toBe(5_500);
    });

    it('updates the black clock when black is the active player', () => {
        const base = buildRunningState();
        const running = {
            ...base,
            lastUpdatedTimeMs: 3_000,
            white: { ...base.white, isActive: false, timeRemainingMs: 15_000 },
            black: { ...base.black, isActive: true, timeRemainingMs: 12_000 },
        };

        const updated = createUpdatedClockState(running, 5_000);

        expect(updated.black.timeRemainingMs).toBe(10_000);
        expect(updated.white.timeRemainingMs).toBe(15_000);
        expect(updated.black.isActive).toBe(true);
        expect(updated.white.isActive).toBe(false);
        expect(updated.lastUpdatedTimeMs).toBe(5_000);
    });

    it('switches the active player and applies increment when provided', () => {
        const base = buildRunningState();
        const running = {
            ...base,
            lastUpdatedTimeMs: 2_000,
            white: { ...base.white, timeRemainingMs: 5_000 },
            black: { ...base.black, timeRemainingMs: 9_000 },
        };

        const updated = createUpdatedClockState(running, 3_500, 'black');

        expect(updated.white.timeRemainingMs).toBe(6_500);
        expect(updated.white.isActive).toBe(false);
        expect(updated.black.isActive).toBe(true);
        expect(updated.black.timeRemainingMs).toBe(9_000);
        expect(updated.lastUpdatedTimeMs).toBe(3_500);
    });

    it('switches from black to white and applies increment to the previously active player', () => {
        const base = buildRunningState();
        const running = {
            ...base,
            lastUpdatedTimeMs: 1_000,
            white: { ...base.white, isActive: false, timeRemainingMs: 8_000 },
            black: { ...base.black, isActive: true, timeRemainingMs: 6_000 },
        };

        const updated = createUpdatedClockState(running, 2_500, 'white');

        expect(updated.black.timeRemainingMs).toBe(7_500);
        expect(updated.black.isActive).toBe(false);
        expect(updated.white.isActive).toBe(true);
        expect(updated.white.timeRemainingMs).toBe(8_000);
        expect(updated.lastUpdatedTimeMs).toBe(2_500);
    });

    it('returns the original state when the clock is paused', () => {
        const paused = buildPausedState();

        const updated = createUpdatedClockState(paused, 2_000);

        expect(updated).toBe(paused);
    });

    it('throws when provided an invalid clock state', () => {
        const base = buildRunningState();
        const invalid = {
            ...base,
            white: { ...base.white, timeRemainingMs: -1 },
        };

        expect(() => createUpdatedClockState(invalid, 2_000)).toThrow(InvalidInputError);
    });
});

describe('computeGameStateBasedOnClock', () => {
    it('returns null when the clock is paused', () => {
        const board = createMockChessBoard();
        const state = buildPausedState();

        const result = computeGameStateBasedOnClock(state, board);

        expect(result).toBeNull();
        expect(vi.mocked(hasInsufficientMatingMaterial)).not.toHaveBeenCalled();
    });

    it('returns null when both players still have time remaining', () => {
        const board = createMockChessBoard();
        const state = buildRunningState();

        const result = computeGameStateBasedOnClock(state, board);

        expect(result).toBeNull();
        expect(vi.mocked(hasInsufficientMatingMaterial)).not.toHaveBeenCalled();
    });

    it('reports a time-out when a player flags and the opponent can mate', () => {
        const board = createMockChessBoard();
        const base = buildRunningState();
        const state = {
            ...base,
            white: { ...base.white, timeRemainingMs: 0 },
            black: { ...base.black, timeRemainingMs: 5_000 },
        };
        const insufficientMock = vi.mocked(hasInsufficientMatingMaterial);
        insufficientMock.mockReturnValue(false);

        const result = computeGameStateBasedOnClock(state, board);

        expect(result).toEqual({ status: 'time-out', winner: 'black' });
        expect(insufficientMock).toHaveBeenCalledWith(board, 'black');
    });

    it('reports insufficient material when the opponent cannot mate', () => {
        const board = createMockChessBoard();
        const base = buildRunningState();
        const state = {
            ...base,
            white: { ...base.white, timeRemainingMs: 5_000 },
            black: { ...base.black, timeRemainingMs: 0 },
        };
        const insufficientMock = vi.mocked(hasInsufficientMatingMaterial);
        insufficientMock.mockReturnValue(true);

        const result = computeGameStateBasedOnClock(state, board);

        expect(result?.status).toBe('insufficient-material');
        expect(result?.winner).toBeUndefined();
        expect(insufficientMock).toHaveBeenCalledWith(board, 'white');
    });
});
