import * as chessClocks from '@grouchess/chess-clocks';
import { createMockChessClockState } from '@grouchess/test-utils';
import { renderHook } from 'vitest-browser-react';

import {
    useChessClock,
    useChessGame,
    type ChessClockContextType,
    type ChessGameContextType,
} from '../../providers/ChessGameRoomProvider';
import { useClockTick, type ClockTickContextType } from '../../providers/ClockTickProvider';
import {
    createMockChessClockContextValues,
    createMockChessGameContextValues,
} from '../../providers/__mocks__/ChessGameRoomProvider';
import { createMockClockTickContextValues } from '../../providers/__mocks__/ClockTickProvider';
import { useTimeoutDetection } from '../useTimeoutDetection';

vi.mock('../../providers/ChessGameRoomProvider', () => ({
    useChessClock: vi.fn(),
    useChessGame: vi.fn(),
}));

vi.mock('../../providers/ClockTickProvider', () => ({
    useClockTick: vi.fn(),
}));

vi.mock('@grouchess/chess-clocks', { spy: true });

type RenderUseTimeoutDetectionOptions = {
    clockTickContextValues?: ClockTickContextType;
    chessGameContextValues?: ChessGameContextType;
    chessClockContextValues?: ChessClockContextType;
};

async function renderUseTimeoutDetection(options: RenderUseTimeoutDetectionOptions = {}) {
    const clockTickContext = options.clockTickContextValues ?? createMockClockTickContextValues();
    const chessGameContext = options.chessGameContextValues ?? createMockChessGameContextValues();
    const chessClockContext = options.chessClockContextValues ?? createMockChessClockContextValues();

    // Convert functions to spies if not already
    if (!vi.isMockFunction(chessClockContext.setClocks)) {
        chessClockContext.setClocks = vi.fn(chessClockContext.setClocks);
    }
    if (!vi.isMockFunction(chessGameContext.endGame)) {
        chessGameContext.endGame = vi.fn(chessGameContext.endGame);
    }

    vi.mocked(useClockTick).mockReturnValue(clockTickContext);
    vi.mocked(useChessGame).mockReturnValue(chessGameContext);
    vi.mocked(useChessClock).mockReturnValue(chessClockContext);

    const renderResult = await renderHook(() => useTimeoutDetection());

    return {
        ...renderResult,
        clockTickContext,
        chessGameContext,
        chessClockContext,
    };
}

describe('useTimeoutDetection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ends the game and pauses clocks when a player times out', async () => {
        const clockState = createMockChessClockState({
            baseTimeMs: 600000,
            incrementMs: 0,
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 0; // White has timed out
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 0;

        const pausedClockState = createMockChessClockState({
            isPaused: true,
        });

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
            status: 'time-out',
            winner: 'black',
        });
        vi.spyOn(chessClocks, 'createPausedClockState').mockReturnValue(pausedClockState);

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 600000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'in-progress';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        const { chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).toHaveBeenCalledWith(pausedClockState);
        expect(chessGameContext.endGame).toHaveBeenCalledWith({
            reason: 'time-out',
            winner: 'black',
        });
    });

    it('avoids handling timeout multiple times for the same game state', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 0;
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 0;

        const pausedClockState = createMockChessClockState({
            isPaused: true,
        });

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
            status: 'time-out',
            winner: 'black',
        });
        vi.spyOn(chessClocks, 'createPausedClockState').mockReturnValue(pausedClockState);

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 600000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'in-progress';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        const { rerender, chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).toHaveBeenCalledTimes(1);
        expect(chessGameContext.endGame).toHaveBeenCalledTimes(1);

        // Re-render with same conditions
        rerender();

        expect(chessClockContext.setClocks).toHaveBeenCalledTimes(1);
        expect(chessGameContext.endGame).toHaveBeenCalledTimes(1);
    });

    it('resets the timeout handled flag when a new game becomes in-progress', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 0;
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 0;

        const pausedClockState = createMockChessClockState({
            isPaused: true,
        });

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
            status: 'time-out',
            winner: 'black',
        });
        vi.spyOn(chessClocks, 'createPausedClockState').mockReturnValue(pausedClockState);

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 600000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'in-progress';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        // Initial render with timeout
        const { rerender, chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).toHaveBeenCalledTimes(1);
        expect(chessGameContext.endGame).toHaveBeenCalledTimes(1);

        // Change game status to something other than in-progress
        chessGameContext.chessGame.gameState.status = 'time-out';
        vi.mocked(useChessGame).mockReturnValue(chessGameContext);
        rerender();

        // Reset mocks to track new calls
        vi.mocked(chessClockContext.setClocks).mockClear();
        vi.mocked(chessGameContext.endGame).mockClear();

        // Change game status back to in-progress (new game)
        chessGameContext.chessGame.gameState.status = 'in-progress';
        vi.mocked(useChessGame).mockReturnValue(chessGameContext);
        rerender();

        // Timeout should be handled again
        expect(chessClockContext.setClocks).toHaveBeenCalledTimes(1);
        expect(chessGameContext.endGame).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the game state is not in progress', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 0;
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 0;

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
            status: 'time-out',
            winner: 'black',
        });

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 600000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'checkmate';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        const { chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).not.toHaveBeenCalled();
        expect(chessGameContext.endGame).not.toHaveBeenCalled();
    });

    describe('does nothing when clocks are paused or the clock tick is stopped', () => {
        it.each([
            { scenario: 'clocks are paused', isPaused: true, isRunning: true },
            { scenario: 'clock tick is stopped', isPaused: false, isRunning: false },
            { scenario: 'both clocks are paused and clock tick is stopped', isPaused: true, isRunning: false },
        ])('when $scenario', async ({ isPaused, isRunning }) => {
            const clockState = createMockChessClockState({
                isPaused,
                lastUpdatedTimeMs: isPaused ? null : 0,
            });
            if (!isPaused) {
                clockState.white.timeRemainingMs = 0;
                clockState.white.isActive = true;
            }

            const updatedClockState = createMockChessClockState();
            updatedClockState.white.timeRemainingMs = 0;

            vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
            vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
                status: 'time-out',
                winner: 'black',
            });

            const clockTickContextValues = createMockClockTickContextValues();
            clockTickContextValues.isRunning = isRunning;
            clockTickContextValues.nowMs = 600000;

            const chessGameContextValues = createMockChessGameContextValues();
            chessGameContextValues.chessGame.gameState.status = 'in-progress';

            const chessClockContextValues = createMockChessClockContextValues();
            chessClockContextValues.clockState = clockState;

            const { chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
                clockTickContextValues,
                chessGameContextValues,
                chessClockContextValues,
            });

            expect(chessClockContext.setClocks).not.toHaveBeenCalled();
            expect(chessGameContext.endGame).not.toHaveBeenCalled();
        });
    });

    it('handles insufficient material timeout as a draw', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 0;
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 0;

        const pausedClockState = createMockChessClockState({
            isPaused: true,
        });

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue({
            status: 'insufficient-material',
            winner: undefined,
        });
        vi.spyOn(chessClocks, 'createPausedClockState').mockReturnValue(pausedClockState);

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 600000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'in-progress';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        const { chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).toHaveBeenCalledWith(pausedClockState);
        expect(chessGameContext.endGame).toHaveBeenCalledWith({
            reason: 'insufficient-material',
            winner: undefined,
        });
    });

    it('does nothing when no player has timed out', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            lastUpdatedTimeMs: 0,
        });
        clockState.white.timeRemainingMs = 300000;
        clockState.black.timeRemainingMs = 300000;
        clockState.white.isActive = true;

        const updatedClockState = createMockChessClockState();
        updatedClockState.white.timeRemainingMs = 300000;
        updatedClockState.black.timeRemainingMs = 300000;

        vi.spyOn(chessClocks, 'createUpdatedClockState').mockReturnValue(updatedClockState);
        vi.spyOn(chessClocks, 'computeGameStateBasedOnClock').mockReturnValue(null);

        const clockTickContextValues = createMockClockTickContextValues();
        clockTickContextValues.isRunning = true;
        clockTickContextValues.nowMs = 100000;

        const chessGameContextValues = createMockChessGameContextValues();
        chessGameContextValues.chessGame.gameState.status = 'in-progress';

        const chessClockContextValues = createMockChessClockContextValues();
        chessClockContextValues.clockState = clockState;

        const { chessClockContext, chessGameContext } = await renderUseTimeoutDetection({
            clockTickContextValues,
            chessGameContextValues,
            chessClockContextValues,
        });

        expect(chessClockContext.setClocks).not.toHaveBeenCalled();
        expect(chessGameContext.endGame).not.toHaveBeenCalled();
    });
});
