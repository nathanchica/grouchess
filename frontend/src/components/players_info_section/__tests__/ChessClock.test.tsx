import { createMockChessClockState } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessClockContext } from '../../../providers/ChessGameRoomProvider';
import { ClockTickContext } from '../../../providers/ClockTickProvider';
import { createMockChessClockContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockClockTickContextValues } from '../../../providers/__mocks__/ClockTickProvider';
import ChessClock from '../ChessClock';

const defaultProps = {
    isActive: false,
    color: 'white' as const,
};

const renderChessClock = ({ propOverrides = {}, clockTickOverrides = {}, chessClockOverrides = {} } = {}) => {
    const clockTickContextValue = createMockClockTickContextValues(clockTickOverrides);
    const chessClockContextValue = createMockChessClockContextValues({
        clockState: createMockChessClockState(),
        ...chessClockOverrides,
    });

    return render(
        <ClockTickContext.Provider value={clockTickContextValue}>
            <ChessClockContext.Provider value={chessClockContextValue}>
                <ChessClock {...defaultProps} {...propOverrides} />
            </ChessClockContext.Provider>
        </ClockTickContext.Provider>
    );
};

describe('ChessClock', () => {
    describe('basic rendering', () => {
        it('renders with required contexts', async () => {
            const { getByRole } = await renderChessClock();
            const timer = getByRole('timer');
            await expect.element(timer).toBeInTheDocument();
        });

        it('throws error when clockState is null', async () => {
            await expect(
                renderChessClock({
                    chessClockOverrides: { clockState: null },
                })
            ).rejects.toThrow('ChessClock requires non-null clockState');
        });
    });

    describe('time display', () => {
        it.each([
            {
                scenario: '5 minutes remaining',
                timeRemainingMs: 5 * 60 * 1000,
                expectedText: '5:00',
            },
            {
                scenario: '1 minute 30 seconds remaining',
                timeRemainingMs: 90 * 1000,
                expectedText: '1:30',
            },
            {
                scenario: '30 seconds remaining',
                timeRemainingMs: 30 * 1000,
                expectedText: '0:30',
            },
            {
                scenario: 'exactly 10 seconds (boundary)',
                timeRemainingMs: 10 * 1000,
                expectedText: '0:10',
            },
        ])('displays $scenario without showing milliseconds', async ({ timeRemainingMs, expectedText }) => {
            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: false },
                isPaused: true,
            });

            const { getByRole, getByTestId } = await renderChessClock({
                propOverrides: { color: 'white' },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent(expectedText);

            // Milliseconds should be hidden
            const msElement = getByTestId('clock-milliseconds');
            await expect.element(msElement).not.toBeVisible();
        });

        it.each([
            {
                scenario: '9 seconds 500ms',
                timeRemainingMs: 9500,
                expectedText: '0:09',
            },
            {
                scenario: '5 seconds',
                timeRemainingMs: 5000,
                expectedText: '0:05',
            },
            {
                scenario: '1 second 234ms',
                timeRemainingMs: 1234,
                expectedText: '0:01',
            },
            {
                scenario: 'zero time',
                timeRemainingMs: 0,
                expectedText: '0:00',
            },
        ])('displays $scenario with visible milliseconds', async ({ timeRemainingMs, expectedText }) => {
            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: false },
                isPaused: true,
            });

            const { getByRole, getByTestId } = await renderChessClock({
                propOverrides: { color: 'white' },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent(expectedText);

            // Milliseconds should be visible (not have invisible class)
            const msElement = getByTestId('clock-milliseconds');
            await expect.element(msElement).toBeVisible();
        });

        it('prevents negative time display', async () => {
            const clockState = createMockChessClockState({
                white: { timeRemainingMs: -5000, isActive: false },
                isPaused: true,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { color: 'white' },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:00');
        });

        it.each([
            {
                scenario: 'white clock',
                color: 'white' as const,
                whiteTime: 120000,
                blackTime: 60000,
                expectedText: '2:00',
            },
            {
                scenario: 'black clock',
                color: 'black' as const,
                whiteTime: 120000,
                blackTime: 60000,
                expectedText: '1:00',
            },
        ])('displays correct time for $scenario', async ({ color, whiteTime, blackTime, expectedText }) => {
            const clockState = createMockChessClockState({
                white: { timeRemainingMs: whiteTime, isActive: false },
                black: { timeRemainingMs: blackTime, isActive: false },
                isPaused: true,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { color },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent(expectedText);
        });
    });

    describe('active state', () => {
        it('shows stopwatch icon when active', async () => {
            const clockState = createMockChessClockState();

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true },
                chessClockOverrides: { clockState },
            });

            const icon = getByRole('img', { name: 'Stopwatch', includeHidden: true });
            await expect.element(icon).toBeInTheDocument();
        });

        it('does not show stopwatch icon when inactive', async () => {
            const clockState = createMockChessClockState();

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: false },
                chessClockOverrides: { clockState },
            });

            const icon = getByRole('img', { name: 'Stopwatch', includeHidden: true });
            await expect.element(icon).not.toBeInTheDocument();
        });
    });

    describe('clock calculations', () => {
        it('calculates elapsed time for active running clock', async () => {
            const nowMs = 1000;
            const lastUpdatedTimeMs = 500;
            const timeRemainingMs = 10000;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: true },
                isPaused: false,
                lastUpdatedTimeMs,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:09');
        });

        it('shows static time when active but paused', async () => {
            const nowMs = 1000;
            const lastUpdatedTimeMs = 500;
            const timeRemainingMs = 10000;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: true },
                isPaused: true,
                lastUpdatedTimeMs,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:10');
        });

        it('shows static time when inactive', async () => {
            const nowMs = 1000;
            const lastUpdatedTimeMs = 500;
            const timeRemainingMs = 10000;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: false },
                isPaused: false,
                lastUpdatedTimeMs,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: false, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:10');
        });

        it('handles null lastUpdatedTimeMs (elapsed = 0)', async () => {
            const nowMs = 1000;
            const timeRemainingMs = 10000;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: true },
                isPaused: false,
                lastUpdatedTimeMs: null,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:10');
        });

        it('prevents negative elapsed time (when nowMs < lastUpdatedTimeMs)', async () => {
            const nowMs = 500;
            const lastUpdatedTimeMs = 1000; // Future time
            const timeRemainingMs = 10000;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: true },
                isPaused: false,
                lastUpdatedTimeMs,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:10');
        });

        it('handles time running out (approaching 0)', async () => {
            const nowMs = 10000;
            const lastUpdatedTimeMs = 9000;
            const timeRemainingMs = 500;

            const clockState = createMockChessClockState({
                white: { timeRemainingMs, isActive: true },
                isPaused: false,
                lastUpdatedTimeMs,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { isActive: true, color: 'white' },
                clockTickOverrides: { nowMs },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveTextContent('0:00');
        });
    });

    describe('accessibility', () => {
        it('has role="timer"', async () => {
            const clockState = createMockChessClockState();

            const { getByRole } = await renderChessClock({
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toBeInTheDocument();
        });

        it('has aria-live="polite"', async () => {
            const clockState = createMockChessClockState();

            const { getByRole } = await renderChessClock({
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveAttribute('aria-live', 'polite');
        });

        it.each([
            {
                scenario: 'white clock with time',
                color: 'white' as const,
                timeRemainingMs: 125000,
                expectedLabel: 'white clock: 2:050 remaining',
            },
            {
                scenario: 'black clock with time',
                color: 'black' as const,
                timeRemainingMs: 65000,
                expectedLabel: 'black clock: 1:050 remaining',
            },
            {
                scenario: 'white clock under 10 seconds',
                color: 'white' as const,
                timeRemainingMs: 5432,
                expectedLabel: 'white clock: 0:054 remaining',
            },
            {
                scenario: 'black clock at zero',
                color: 'black' as const,
                timeRemainingMs: 0,
                expectedLabel: 'black clock: 0:000 remaining',
            },
        ])('has descriptive aria-label for $scenario', async ({ color, timeRemainingMs, expectedLabel }) => {
            const clockState = createMockChessClockState({
                [color]: { timeRemainingMs, isActive: false },
                isPaused: true,
            });

            const { getByRole } = await renderChessClock({
                propOverrides: { color },
                chessClockOverrides: { clockState },
            });

            const timer = getByRole('timer');
            await expect.element(timer).toHaveAttribute('aria-label', expectedLabel);
        });
    });
});
