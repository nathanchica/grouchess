import { createMockChessClockState } from '@grouchess/test-utils';
import type { Mock } from 'vitest';

import { rebaseServerClockToPerf } from '../clock';

describe('rebaseServerClockToPerf', () => {
    let dateNowSpy: Mock<() => number>;
    let performanceNowSpy: Mock<() => number>;

    beforeEach(() => {
        dateNowSpy = vi.spyOn(Date, 'now');
        performanceNowSpy = vi.spyOn(performance, 'now');
    });

    afterEach(() => {
        dateNowSpy.mockRestore();
        performanceNowSpy.mockRestore();
    });

    it('returns unchanged clock state when lastUpdatedTimeMs is null', () => {
        const clockState = createMockChessClockState({ lastUpdatedTimeMs: null });
        const result = rebaseServerClockToPerf(clockState);

        expect(result).toEqual(clockState);
        expect(result).toBe(clockState); // Should return the same reference
    });

    it.each([
        {
            scenario: 'server time 1000ms in the past',
            serverTime: 5000,
            nowEpoch: 6000,
            nowPerf: 100,
            expectedPerfTime: -900, // 100 - (6000 - 5000)
        },
        {
            scenario: 'server time 2500ms in the past',
            serverTime: 10000,
            nowEpoch: 12500,
            nowPerf: 500,
            expectedPerfTime: -2000, // 500 - (12500 - 10000)
        },
        {
            scenario: 'server time equals current time (delta = 0)',
            serverTime: 5000,
            nowEpoch: 5000,
            nowPerf: 100,
            expectedPerfTime: 100, // 100 - 0
        },
        {
            scenario: 'very small delta (1ms)',
            serverTime: 4999,
            nowEpoch: 5000,
            nowPerf: 100,
            expectedPerfTime: 99, // 100 - 1
        },
        {
            scenario: 'large time delta (1 hour in the past)',
            serverTime: 1000000,
            nowEpoch: 1000000 + 3600000, // +1 hour
            nowPerf: 10000,
            expectedPerfTime: -3590000, // 10000 - 3600000
        },
    ])(
        'converts server time to performance time correctly when $scenario',
        ({ serverTime, nowEpoch, nowPerf, expectedPerfTime }) => {
            dateNowSpy.mockReturnValue(nowEpoch);
            performanceNowSpy.mockReturnValue(nowPerf);

            const clockState = createMockChessClockState({ lastUpdatedTimeMs: serverTime });
            const result = rebaseServerClockToPerf(clockState);

            expect(result.lastUpdatedTimeMs).toBe(expectedPerfTime);
        }
    );

    it('prevents negative delta when server time is in the future', () => {
        const futureServerTime = 10000;
        const currentEpoch = 5000; // Server time is 5000ms ahead
        const currentPerf = 100;

        dateNowSpy.mockReturnValue(currentEpoch);
        performanceNowSpy.mockReturnValue(currentPerf);

        const clockState = createMockChessClockState({ lastUpdatedTimeMs: futureServerTime });
        const result = rebaseServerClockToPerf(clockState);

        // Math.max(0, currentEpoch - futureServerTime) = Math.max(0, -5000) = 0
        // lastUpdatedPerf = currentPerf - 0 = 100
        expect(result.lastUpdatedTimeMs).toBe(100);
    });

    it('preserves all other clock state properties unchanged', () => {
        dateNowSpy.mockReturnValue(6000);
        performanceNowSpy.mockReturnValue(100);

        const originalState = createMockChessClockState({
            lastUpdatedTimeMs: 5000,
            white: { timeRemainingMs: 300000, isActive: true },
            black: { timeRemainingMs: 280000, isActive: false },
            baseTimeMs: 300000,
            incrementMs: 5000,
            isPaused: false,
        });

        const result = rebaseServerClockToPerf(originalState);

        // Only lastUpdatedTimeMs should change
        expect(result.white).toEqual(originalState.white);
        expect(result.black).toEqual(originalState.black);
        expect(result.baseTimeMs).toBe(originalState.baseTimeMs);
        expect(result.incrementMs).toBe(originalState.incrementMs);
        expect(result.isPaused).toBe(originalState.isPaused);
        expect(result.lastUpdatedTimeMs).not.toBe(originalState.lastUpdatedTimeMs);
    });

    it('does not mutate the original clock state object', () => {
        dateNowSpy.mockReturnValue(6000);
        performanceNowSpy.mockReturnValue(100);

        const originalState = createMockChessClockState({
            lastUpdatedTimeMs: 5000,
        });
        const originalLastUpdated = originalState.lastUpdatedTimeMs;

        rebaseServerClockToPerf(originalState);

        // Original object should be unchanged
        expect(originalState.lastUpdatedTimeMs).toBe(originalLastUpdated);
    });
});
