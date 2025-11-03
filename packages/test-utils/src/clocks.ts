import type { ChessClockState } from '@grouchess/chess-clocks';

/**
 * Creates a mock ChessClockState
 * @param overrides - Partial overrides for the clock state
 * @returns A complete ChessClockState object
 *
 * @example
 * // Create default clock state (10 minutes + 0 increment)
 * const clock = createMockChessClockState();
 *
 * @example
 * // Create clock state with custom time control
 * const clock = createMockChessClockState({
 *   baseTimeMs: 180000, // 3 minutes
 *   incrementMs: 2000,  // 2 second increment
 * });
 *
 * @example
 * // Create clock state with white's turn active
 * const clock = createMockChessClockState({
 *   white: { timeRemainingMs: 300000, isActive: true },
 *   black: { timeRemainingMs: 300000, isActive: false },
 * });
 */
export function createMockChessClockState(overrides?: Partial<ChessClockState>): ChessClockState {
    const baseTimeMs = overrides?.baseTimeMs ?? 600000; // Default: 10 minutes
    const incrementMs = overrides?.incrementMs ?? 0; // Default: 0 increment

    const defaultWhite = {
        timeRemainingMs: baseTimeMs,
        isActive: false,
    };

    const defaultBlack = {
        timeRemainingMs: baseTimeMs,
        isActive: false,
    };

    return {
        white: {
            ...defaultWhite,
            ...overrides?.white,
        },
        black: {
            ...defaultBlack,
            ...overrides?.black,
        },
        lastUpdatedTimeMs: overrides?.lastUpdatedTimeMs ?? null,
        baseTimeMs,
        incrementMs,
        isPaused: overrides?.isPaused ?? false,
    };
}
