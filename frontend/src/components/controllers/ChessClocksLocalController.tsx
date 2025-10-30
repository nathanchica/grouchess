import { useCallback, useEffect, useRef } from 'react';

import { updateClockState, type ChessClockState, type PieceColor } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import { useTimeoutDetection } from '../../hooks/useTimeoutDetection';
import { useChessClock, useChessGame } from '../../providers/ChessGameRoomProvider';
import { useClockTick } from '../../providers/ClockTickProvider';

/**
 * Controls chess clocks locally for self-play (offline) mode.
 * Mirrors backend ChessClockService semantics:
 *  - Clocks start after White's first move (start with Black active, this is a custom rule for this game)
 *  - On each move: update elapsed time for active side, add increment to mover, then switch
 *  - On game over: apply final elapsed time and pause clocks
 */
function ChessClocksLocalController() {
    const { start, stop, isRunning } = useClockTick();
    const { chessGame } = useChessGame();
    const { setClocks, resetClocks, clockState } = useChessClock();
    invariant(clockState, 'ChessClocksLocalController requires non-null clockState');

    useTimeoutDetection();

    const { moveHistory, gameState, timelineVersion } = chessGame;

    const prevMoveCountRef = useRef<number>(moveHistory.length);
    const prevStatusRef = useRef<string>(gameState.status);
    const prevTimelineRef = useRef<number>(timelineVersion);
    const timeoutHandledRef = useRef<boolean>(false);

    const startClock = useCallback((state: ChessClockState, activeColor: PieceColor): ChessClockState => {
        const now = performance.now();
        return {
            white: { ...state.white, isActive: activeColor === 'white' },
            black: { ...state.black, isActive: activeColor === 'black' },
            lastUpdatedTimeMs: now,
            baseTimeMs: state.baseTimeMs,
            incrementMs: state.incrementMs,
            isPaused: false,
        };
    }, []);

    const pauseClock = useCallback((state: ChessClockState): ChessClockState => {
        const updated = updateClockState(state, performance.now());
        return {
            ...updated,
            isPaused: true,
            lastUpdatedTimeMs: null,
        };
    }, []);

    const onMoveApplied = useCallback(
        (movingColor: PieceColor) => {
            const nextActive: PieceColor = movingColor === 'white' ? 'black' : 'white';
            if (clockState.isPaused) {
                // Start clocks after the first move (custom rule)
                const started = startClock(clockState, nextActive);
                setClocks(started);
                return;
            }
            const switched = updateClockState(clockState, performance.now(), nextActive);
            setClocks(switched);
        },
        [clockState, setClocks, startClock]
    );

    // Update clocks after each new move
    useEffect(() => {
        const previousCount = prevMoveCountRef.current;
        const currentCount = moveHistory.length;
        if (currentCount <= previousCount) return;

        const lastMove = moveHistory[currentCount - 1];
        const movingColor = lastMove.move.piece.color;
        onMoveApplied(movingColor);

        prevMoveCountRef.current = currentCount;
    }, [moveHistory, onMoveApplied]);

    // Pause clocks when game ends
    useEffect(() => {
        const prevStatus = prevStatusRef.current;
        const status = gameState.status;

        if (status !== prevStatus && status !== 'in-progress') {
            setClocks(pauseClock(clockState));
            timeoutHandledRef.current = false;
        }

        prevStatusRef.current = status;
    }, [clockState, gameState.status, pauseClock, setClocks]);

    // Reset clocks on game reset (timelineVersion increments each time game is reset)
    useEffect(() => {
        const prevVersion = prevTimelineRef.current;
        const currentVersion = timelineVersion;
        if (currentVersion > prevVersion) {
            resetClocks();
            // Reset move count tracking for the new game timeline
            prevMoveCountRef.current = moveHistory.length;
            timeoutHandledRef.current = false;
        }
        prevTimelineRef.current = currentVersion;
    }, [moveHistory.length, resetClocks, timelineVersion]);

    // Drive shared monotonic timer based on active/paused state
    useEffect(() => {
        const shouldRun = !clockState.isPaused && (clockState.white.isActive || clockState.black.isActive);
        if (shouldRun && !isRunning) {
            start();
        } else if (!shouldRun && isRunning) {
            stop();
        }

        return () => {
            if (isRunning) stop();
        };
    }, [clockState.black.isActive, clockState.isPaused, clockState.white.isActive, isRunning, start, stop]);

    return null;
}

export default ChessClocksLocalController;
