import { createMockChessClockState } from '@grouchess/test-utils';
import type { Mock } from 'vitest';

import { formatMinutesAndSeconds, formatMsPart, parseTime, rebaseServerClockToPerf } from '../clock';

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

describe('parseTime', () => {
    it.each([
        {
            scenario: 'zero milliseconds',
            input: 0,
            expected: { minutes: 0, seconds: 0, milliseconds: 0 },
        },
        {
            scenario: 'only milliseconds (less than 1 second)',
            input: 543,
            expected: { minutes: 0, seconds: 0, milliseconds: 543 },
        },
        {
            scenario: 'exactly 1 second',
            input: 1000,
            expected: { minutes: 0, seconds: 1, milliseconds: 0 },
        },
        {
            scenario: 'seconds with milliseconds (less than 1 minute)',
            input: 5432,
            expected: { minutes: 0, seconds: 5, milliseconds: 432 },
        },
        {
            scenario: 'exactly 1 minute',
            input: 60000,
            expected: { minutes: 1, seconds: 0, milliseconds: 0 },
        },
        {
            scenario: 'minutes and seconds',
            input: 125000,
            expected: { minutes: 2, seconds: 5, milliseconds: 0 },
        },
        {
            scenario: 'minutes, seconds, and milliseconds',
            input: 185750,
            expected: { minutes: 3, seconds: 5, milliseconds: 750 },
        },
        {
            scenario: 'large value (1 hour as minutes)',
            input: 3600000,
            expected: { minutes: 60, seconds: 0, milliseconds: 0 },
        },
        {
            scenario: 'large value with all components',
            input: 3725999,
            expected: { minutes: 62, seconds: 5, milliseconds: 999 },
        },
    ])('parses $scenario correctly', ({ input, expected }) => {
        const result = parseTime(input);
        expect(result).toEqual(expected);
    });
});

describe('formatMinutesAndSeconds', () => {
    it.each([
        {
            scenario: 'zero minutes and seconds',
            minutes: 0,
            seconds: 0,
            expected: '0:00',
        },
        {
            scenario: 'single digit seconds with leading zero',
            minutes: 5,
            seconds: 3,
            expected: '5:03',
        },
        {
            scenario: 'double digit seconds',
            minutes: 5,
            seconds: 42,
            expected: '5:42',
        },
        {
            scenario: 'zero seconds with padding',
            minutes: 10,
            seconds: 0,
            expected: '10:00',
        },
        {
            scenario: 'large minute values',
            minutes: 120,
            seconds: 59,
            expected: '120:59',
        },
        {
            scenario: 'exactly 60 seconds (edge case)',
            minutes: 1,
            seconds: 60,
            expected: '1:60',
        },
    ])('formats $scenario as $expected', ({ minutes, seconds, expected }) => {
        const result = formatMinutesAndSeconds(minutes, seconds);
        expect(result).toBe(expected);
    });
});

describe('formatMsPart', () => {
    it.each([
        {
            scenario: 'rounds down 0-99ms to "0"',
            input: 0,
            expected: '0',
        },
        {
            scenario: 'rounds down 50ms to "0"',
            input: 50,
            expected: '0',
        },
        {
            scenario: 'rounds down 99ms to "0"',
            input: 99,
            expected: '0',
        },
        {
            scenario: 'rounds down 100ms to "1"',
            input: 100,
            expected: '1',
        },
        {
            scenario: 'rounds down 150ms to "1"',
            input: 150,
            expected: '1',
        },
        {
            scenario: 'rounds down 199ms to "1"',
            input: 199,
            expected: '1',
        },
        {
            scenario: 'rounds down 500ms to "5"',
            input: 500,
            expected: '5',
        },
        {
            scenario: 'rounds down 999ms to "9"',
            input: 999,
            expected: '9',
        },
        {
            scenario: 'handles exactly 1000ms (edge case)',
            input: 1000,
            expected: '10',
        },
    ])('$scenario', ({ input, expected }) => {
        const result = formatMsPart(input);
        expect(result).toBe(expected);
    });
});
