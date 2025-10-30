import type { ChessClockState, PieceColor } from '@grouchess/chess';

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
