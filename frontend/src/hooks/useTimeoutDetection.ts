import { useEffect, useRef } from 'react';

import { computeGameStateBasedOnClock, updateClockState, type ExpiredClockGameStatus } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import { useChessClock, useChessGame } from '../providers/ChessGameRoomProvider';
import { useClockTick } from '../providers/ClockTickProvider';

/**
 * Hook to detect time-out based on local clock state and end the game accordingly
 */
export function useTimeoutDetection() {
    const { nowMs, isRunning } = useClockTick();
    const { chessGame, endGame } = useChessGame();
    const { boardState, gameState } = chessGame;
    const { setClocks, clockState } = useChessClock();
    invariant(clockState, 'useTimeoutDetection requires clockState');

    const timeoutHandledRef = useRef<boolean>(false);

    // Detect time-out and end game
    useEffect(() => {
        if (gameState.status !== 'in-progress') return;
        if (clockState.isPaused) return;
        if (!isRunning) return;

        const updatedClockState = updateClockState(clockState, nowMs);
        const expiredClockGameState = computeGameStateBasedOnClock(updatedClockState, boardState.board);
        if (expiredClockGameState && !timeoutHandledRef.current) {
            timeoutHandledRef.current = true;
            setClocks({
                ...updatedClockState,
                isPaused: true,
                lastUpdatedTimeMs: null,
            });
            endGame(expiredClockGameState.status as ExpiredClockGameStatus, expiredClockGameState.winner);
        }
    }, [clockState, boardState.board, endGame, gameState.status, isRunning, nowMs, setClocks]);

    // Reset timeout handled flag on new game
    useEffect(() => {
        if (gameState.status === 'in-progress') {
            timeoutHandledRef.current = false;
        }
    }, [gameState.status]);
}
