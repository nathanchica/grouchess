import { useCallback, useEffect, useRef } from 'react';

import { hasInsufficientMatingMaterial, type ChessClockState, type PieceColor } from '@grouchess/chess';

import { useChessClock } from '../../providers/ChessClockSocketProvider';
import { useChessGame } from '../../providers/ChessGameRoomProvider';

/**
 * Controls chess clocks locally for self-play (offline) mode.
 * Mirrors backend ChessClockService semantics:
 *  - Clocks start after White's first move (start with Black active, this is a custom rule for this game)
 *  - On each move: update elapsed time for active side, add increment to mover, then switch
 *  - On game over: apply final elapsed time and pause clocks
 */
function ChessClocksController() {
    const { chessGame, endGame } = useChessGame();
    const { setClocks, resetClocks, ...clockState } = useChessClock();

    const { moveHistory, gameState, timelineVersion } = chessGame;

    const prevMoveCountRef = useRef<number>(moveHistory.length);
    const prevStatusRef = useRef<string>(gameState.status);
    const prevTimelineRef = useRef<number>(timelineVersion);
    const timeoutHandledRef = useRef<boolean>(false);

    const computeUpdatedClockState = useCallback((state: ChessClockState, switchTo?: PieceColor): ChessClockState => {
        if (state.isPaused || state.lastUpdatedTimeMs === null) return state;

        const now = performance.now();
        const elapsedMs = now - state.lastUpdatedTimeMs;
        const activeColor: PieceColor = state.white.isActive ? 'white' : 'black';

        const newState: ChessClockState = {
            white: { ...state.white },
            black: { ...state.black },
            lastUpdatedTimeMs: now,
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
    }, []);

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

    const pauseClock = useCallback(
        (state: ChessClockState): ChessClockState => {
            const updated = computeUpdatedClockState(state);
            return {
                ...updated,
                isPaused: true,
                lastUpdatedTimeMs: null,
            };
        },
        [computeUpdatedClockState]
    );

    const onMoveApplied = useCallback(
        (movingColor: PieceColor) => {
            const nextActive: PieceColor = movingColor === 'white' ? 'black' : 'white';
            if (clockState.isPaused) {
                // Start clocks after the first move (custom rule)
                const started = startClock(clockState, nextActive);
                setClocks(started);
                return;
            }
            const switched = computeUpdatedClockState(clockState, nextActive);
            setClocks(switched);
        },
        [clockState, computeUpdatedClockState, setClocks, startClock]
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
        if (currentVersion !== prevVersion && currentVersion > prevVersion) {
            resetClocks();
            // Reset move count tracking for the new game timeline
            prevMoveCountRef.current = moveHistory.length;
            timeoutHandledRef.current = false;
        }
        prevTimelineRef.current = currentVersion;
    }, [moveHistory.length, resetClocks, timelineVersion]);

    // Detect time-out in real-time and end game
    useEffect(() => {
        if (gameState.status !== 'in-progress') return;
        if (clockState.isPaused || clockState.lastUpdatedTimeMs === null) return;

        let requestAnimationFrameId: number | null = null;
        const tick = () => {
            const activeColor: PieceColor = clockState.white.isActive ? 'white' : 'black';
            const now = performance.now();
            const elapsedMs = now - (clockState.lastUpdatedTimeMs as number);
            const timeLeft = clockState[activeColor].timeRemainingMs - elapsedMs;
            if (timeLeft <= 0 && !timeoutHandledRef.current) {
                timeoutHandledRef.current = true;
                const updatedAndPaused = pauseClock(clockState);
                setClocks(updatedAndPaused);
                const winner: PieceColor = activeColor === 'white' ? 'black' : 'white';
                const board = chessGame.boardState.board;
                const opponentCanMate = !hasInsufficientMatingMaterial(board, winner);
                if (opponentCanMate) {
                    endGame('time-out', winner);
                } else {
                    endGame('insufficient-material');
                }
                return;
            }
            requestAnimationFrameId = requestAnimationFrame(tick);
        };

        requestAnimationFrameId = requestAnimationFrame(tick);
        return () => {
            if (requestAnimationFrameId) cancelAnimationFrame(requestAnimationFrameId);
        };
    }, [chessGame.boardState.board, clockState, endGame, gameState.status, pauseClock, setClocks]);

    return null;
}

export default ChessClocksController;
