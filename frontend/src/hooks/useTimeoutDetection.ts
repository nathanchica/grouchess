import { useEffect, useRef } from 'react';

import { computeGameStateBasedOnClock, createUpdatedClockState, createPausedClockState } from '@grouchess/chess-clocks';
import type { ExpiredClockGameStatus } from '@grouchess/models';
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

        const updatedClockState = createUpdatedClockState(clockState, nowMs);
        const expiredClockGameState = computeGameStateBasedOnClock(updatedClockState, boardState.board);
        if (expiredClockGameState && !timeoutHandledRef.current) {
            timeoutHandledRef.current = true;
            const pausedClockState = createPausedClockState(updatedClockState);
            setClocks(pausedClockState);
            endGame({
                reason: expiredClockGameState.status as ExpiredClockGameStatus,
                winner: expiredClockGameState.winner,
            });
        }
    }, [clockState, boardState.board, endGame, gameState.status, isRunning, nowMs, setClocks]);

    // Reset timeout handled flag on new game
    useEffect(() => {
        if (gameState.status === 'in-progress') {
            timeoutHandledRef.current = false;
        }
    }, [gameState.status]);
}
