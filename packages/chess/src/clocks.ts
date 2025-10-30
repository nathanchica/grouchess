import { hasInsufficientMatingMaterial } from './draws.js';
import type { ChessBoardType, ChessClockState, ChessGameState, PieceColor } from './schema.js';

/**
 * Updates the chess clock state based on elapsed time from the provided `nowMs` and optional switch of active player.
 * If switchTo is provided, the active player is switched to that color and increment is added.
 */
export function updateClockState(state: ChessClockState, nowMs: number, switchTo?: PieceColor): ChessClockState {
    if (state.isPaused || state.lastUpdatedTimeMs === null) return state;

    const elapsedMs = nowMs - state.lastUpdatedTimeMs;
    const activeColor: PieceColor = state.white.isActive ? 'white' : 'black';

    const newState: ChessClockState = {
        white: { ...state.white },
        black: { ...state.black },
        lastUpdatedTimeMs: nowMs,
        baseTimeMs: state.baseTimeMs,
        incrementMs: state.incrementMs,
        isPaused: state.isPaused,
    };

    let newTimeRemaining = newState[activeColor].timeRemainingMs - elapsedMs;

    if (switchTo) {
        newTimeRemaining += newState.incrementMs;
        newState.white.isActive = switchTo === 'white';
        newState.black.isActive = switchTo === 'black';
    }

    newState[activeColor].timeRemainingMs = Math.max(0, newTimeRemaining);

    return newState;
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
