import type { TimeControl } from '@grouchess/game-room';

import { createInitialChessClockState, MS_PER_MINUTE, MS_PER_SECOND } from '../state.js';

const createTimeControl = (minutes: number, increment: number): TimeControl => ({
    alias: `${minutes}|${increment}`,
    minutes,
    increment,
    displayText: `${minutes}|${increment}`,
});

describe('createInitialChessClockState', () => {
    it('initializes both clocks with the same base time and paused state', () => {
        const timeControl = createTimeControl(5, 3);

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
        const timeControl = createTimeControl(0, 0);

        const state = createInitialChessClockState(timeControl);

        expect(state.white.timeRemainingMs).toBe(0);
        expect(state.black.timeRemainingMs).toBe(0);
        expect(state.baseTimeMs).toBe(0);
        expect(state.incrementMs).toBe(0);
    });
});
