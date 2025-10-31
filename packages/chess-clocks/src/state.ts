import { hasInsufficientMatingMaterial } from '@grouchess/chess';
import type { ChessBoardType, ChessGameState, PieceColor } from '@grouchess/chess';
import { InvalidInputError } from '@grouchess/errors';
import type { TimeControl } from '@grouchess/game-room';

import type { ChessClockState } from './schema.js';

export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;

/**
 * Creates the initial chess clock state based on the provided time control.
 * @param timeControl The time control settings for the game.
 * @returns The initial chess clock state.
 */
export function createInitialChessClockState(timeControl: TimeControl): ChessClockState {
    const baseTimeMs = timeControl.minutes * MS_PER_MINUTE;
    const incrementMs = timeControl.increment * MS_PER_SECOND;
    return {
        white: {
            timeRemainingMs: baseTimeMs,
            isActive: false,
        },
        black: {
            timeRemainingMs: baseTimeMs,
            isActive: false,
        },
        lastUpdatedTimeMs: null,
        baseTimeMs,
        incrementMs,
        isPaused: true,
    };
}

/**
 * Validates the given chess clock state.
 * @param state The chess clock state to validate.
 * @throws {InvalidInputError} If the clock state is invalid.
 */
export function validateClockState({
    white,
    black,
    baseTimeMs,
    incrementMs,
    isPaused,
    lastUpdatedTimeMs,
}: ChessClockState): void {
    if (white.timeRemainingMs < 0) throw new InvalidInputError('Invalid white time remaining');
    if (black.timeRemainingMs < 0) throw new InvalidInputError('Invalid black time remaining');
    if (baseTimeMs < 0) throw new InvalidInputError('Invalid base time');
    if (incrementMs < 0) throw new InvalidInputError('Invalid increment');
    if (isPaused) {
        if (lastUpdatedTimeMs !== null)
            throw new InvalidInputError('Last updated time must be null when clock is paused');
    } else {
        if (lastUpdatedTimeMs === null)
            throw new InvalidInputError('Last updated time cannot be null when clock is running');
        if (!white.isActive && !black.isActive) throw new InvalidInputError('No active player');
        if (white.isActive && black.isActive) throw new InvalidInputError('Both players cannot be active');
    }
}

/**
 * Creates a new chess clock state for starting a game or resuming a paused clock state.
 *
 * @param clockState The current clock state.
 * @param activeColor The color of the player whose turn it is.
 * @param nowMs The current time in milliseconds.
 * @param incrementColor The color of the player to whom the increment should be applied (Useful for adding increment on first move).
 * @returns The new started clock state.
 */
export function createStartedClockState(
    clockState: ChessClockState,
    activeColor: PieceColor,
    nowMs: number,
    incrementColor?: PieceColor
): ChessClockState {
    validateClockState(clockState);

    const next: ChessClockState = {
        ...clockState,
        white: {
            ...clockState.white,
            isActive: activeColor === 'white',
            timeRemainingMs:
                clockState.white.timeRemainingMs + (incrementColor === 'white' ? clockState.incrementMs : 0),
        },
        black: {
            ...clockState.black,
            isActive: activeColor === 'black',
            timeRemainingMs:
                clockState.black.timeRemainingMs + (incrementColor === 'black' ? clockState.incrementMs : 0),
        },
        lastUpdatedTimeMs: nowMs,
        isPaused: false,
    };

    return next;
}

/**
 * Creates a new paused clock state for ending a game or pausing the clock.
 *
 * @param clockState The current clock state.
 * @returns The new paused clock state.
 */
export function createPausedClockState(clockState: ChessClockState): ChessClockState {
    validateClockState(clockState);

    return {
        ...clockState,
        isPaused: true,
        lastUpdatedTimeMs: null,
    };
}

/**
 * Creates an updated clock state based on the current time and the active player.
 * @param clockState The current clock state.
 * @param nowMs The current time in milliseconds.
 * @param switchTo The color of the player to switch to. If provided, the active player is switched to this color and increment is added.
 * @returns The updated clock state.
 */
export function createUpdatedClockState(
    clockState: ChessClockState,
    nowMs: number,
    switchTo?: PieceColor
): ChessClockState {
    validateClockState(clockState);

    if (clockState.isPaused || clockState.lastUpdatedTimeMs === null) return clockState;

    const prevActiveColor: PieceColor = clockState.white.isActive ? 'white' : 'black';
    const elapsedMs = Math.max(0, nowMs - clockState.lastUpdatedTimeMs);
    const incrementedTimeMs = switchTo ? clockState.incrementMs : 0;
    const newTimeRemaining = Math.max(0, clockState[prevActiveColor].timeRemainingMs - elapsedMs + incrementedTimeMs);

    if (!switchTo) {
        return {
            ...clockState,
            [prevActiveColor]: {
                ...clockState[prevActiveColor],
                timeRemainingMs: newTimeRemaining,
            },
            lastUpdatedTimeMs: nowMs,
        };
    }

    /**
     * When switching active players, we need to:
     * 1. Update the time remaining for the previously active player.
     * 2. Add increment to the previously active player's time.
     * 3. Switch the active player.
     */
    const newActiveColor: PieceColor = switchTo;
    return {
        ...clockState,
        white: {
            ...clockState.white,
            timeRemainingMs: prevActiveColor === 'white' ? newTimeRemaining : clockState.white.timeRemainingMs,
            isActive: newActiveColor === 'white',
        },
        black: {
            ...clockState.black,
            timeRemainingMs: prevActiveColor === 'black' ? newTimeRemaining : clockState.black.timeRemainingMs,
            isActive: newActiveColor === 'black',
        },
        lastUpdatedTimeMs: nowMs,
    };
}

/**
 * Computes the game state if the clock has run out for either player.
 * If time has run out, opponent wins unless they have insufficient mating material (then it's a draw).
 * If time has not run out or is paused, returns null.
 */
export function computeGameStateBasedOnClock(
    clockState: ChessClockState,
    board: ChessBoardType
): ChessGameState | null {
    if (clockState.isPaused) return null;
    const whiteTimeRemaining = clockState.white.timeRemainingMs;
    const blackTimeRemaining = clockState.black.timeRemainingMs;
    if (whiteTimeRemaining > 0 && blackTimeRemaining > 0) return null;

    // If we reach this point, at least one player's time has run out
    const expiredColor = whiteTimeRemaining <= 0 ? 'white' : 'black';
    const winner: PieceColor = expiredColor === 'white' ? 'black' : 'white';
    const opponentCanMate = !hasInsufficientMatingMaterial(board, winner);

    return {
        status: opponentCanMate ? 'time-out' : 'insufficient-material',
        winner: opponentCanMate ? winner : undefined,
    };
}
