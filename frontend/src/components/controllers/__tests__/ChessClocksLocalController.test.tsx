import * as chessClockModule from '@grouchess/chess-clocks';
import type { BoardIndex, ChessGameStatus, PieceColor } from '@grouchess/models';
import { createMockChessClockState, createMockMove, createMockMoveRecord } from '@grouchess/test-utils';
import { type Mock } from 'vitest';
import { render } from 'vitest-browser-react';

import * as timeoutDetectionModule from '../../../hooks/useTimeoutDetection';
import {
    ChessClockContext,
    type ChessClockContextType,
    ChessGameContext,
    type ChessGameContextType,
} from '../../../providers/ChessGameRoomProvider';
import { ClockTickContext, type ClockTickContextType } from '../../../providers/ClockTickProvider';
import {
    createMockChessClockContextValues,
    createMockChessGameContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockClockTickContextValues } from '../../../providers/__mocks__/ClockTickProvider';
import ChessClocksLocalController from '../ChessClocksLocalController';

vi.mock('@grouchess/chess-clocks', { spy: true });
vi.mock('../../../hooks/useTimeoutDetection', { spy: true });

let useTimeoutDetectionSpy: Mock<() => void>;

type RenderChessClocksLocalControllerOptions = {
    chessClockContextValue?: ChessClockContextType;
    chessGameContextValue?: ChessGameContextType;
    clockTickContextValue?: ClockTickContextType;
};

type ResolvedRenderChessClocksLocalControllerOptions = {
    chessClockContextValue: ChessClockContextType;
    chessGameContextValue: ChessGameContextType;
    clockTickContextValue: ClockTickContextType;
};

function buildProviders({
    chessClockContextValue,
    chessGameContextValue,
    clockTickContextValue,
}: ResolvedRenderChessClocksLocalControllerOptions) {
    return (
        <ClockTickContext.Provider value={clockTickContextValue}>
            <ChessGameContext.Provider value={chessGameContextValue}>
                <ChessClockContext.Provider value={chessClockContextValue}>
                    <ChessClocksLocalController />
                </ChessClockContext.Provider>
            </ChessGameContext.Provider>
        </ClockTickContext.Provider>
    );
}

function resolveRenderOptions({
    chessClockContextValue,
    chessGameContextValue = createChessGameContextValue(),
    clockTickContextValue,
}: RenderChessClocksLocalControllerOptions = {}): ResolvedRenderChessClocksLocalControllerOptions {
    const resolvedClockContext =
        chessClockContextValue ??
        (() => {
            const value = createMockChessClockContextValues();
            value.clockState = createMockChessClockState();
            return value;
        })();
    const resolvedTickContext =
        clockTickContextValue ??
        (() => {
            const value = createMockClockTickContextValues();
            return value;
        })();

    return {
        chessClockContextValue: resolvedClockContext,
        chessGameContextValue,
        clockTickContextValue: resolvedTickContext,
    };
}

async function renderChessClocksLocalController(initialOptions: RenderChessClocksLocalControllerOptions = {}) {
    let currentOptions = resolveRenderOptions(initialOptions);
    const renderResult = await render(buildProviders(currentOptions));

    const rerenderChessClocksLocalController = (nextOptions: RenderChessClocksLocalControllerOptions = {}) => {
        currentOptions = {
            chessClockContextValue: nextOptions.chessClockContextValue ?? currentOptions.chessClockContextValue,
            chessGameContextValue: nextOptions.chessGameContextValue ?? currentOptions.chessGameContextValue,
            clockTickContextValue: nextOptions.clockTickContextValue ?? currentOptions.clockTickContextValue,
        };
        renderResult.rerender(buildProviders(currentOptions));
    };

    return {
        ...renderResult,
        rerenderChessClocksLocalController,
    };
}

type CreateChessGameContextValueOptions = {
    moveHistory?: ReturnType<typeof createMockMoveRecord>[];
    status?: ChessGameStatus;
    timelineVersion?: number;
};

function createChessGameContextValue({
    moveHistory = [],
    status = 'in-progress',
    timelineVersion = 0,
}: CreateChessGameContextValueOptions = {}): ChessGameContextType {
    const base = createMockChessGameContextValues();
    return {
        ...base,
        chessGame: {
            ...base.chessGame,
            moveHistory,
            timelineVersion,
            gameState: {
                ...base.chessGame.gameState,
                status,
            },
        },
    };
}

function createMoveRecordForColor(color: PieceColor): ReturnType<typeof createMockMoveRecord> {
    return createMockMoveRecord({
        move: createMockMove({
            startIndex: 12 as BoardIndex,
            endIndex: 20 as BoardIndex,
            type: 'standard',
            piece: {
                alias: color === 'white' ? 'P' : 'p',
                color,
                type: 'pawn',
                value: 1,
            },
        }),
    });
}

describe('ChessClocksLocalController', () => {
    beforeEach(() => {
        useTimeoutDetectionSpy = vi.spyOn(timeoutDetectionModule, 'useTimeoutDetection').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('registers timeout detection hook on mount', async () => {
        await renderChessClocksLocalController();

        expect(useTimeoutDetectionSpy).toHaveBeenCalledTimes(1);
    });

    it('starts clocks when white makes the first move of the timeline', async () => {
        const clockState = createMockChessClockState({ isPaused: true });
        const setClocks = vi.fn();
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;
        chessClockContextValue.setClocks = setClocks;
        const baseGameContextValue = createChessGameContextValue({
            moveHistory: [],
            timelineVersion: 0,
        });

        const { rerenderChessClocksLocalController } = await renderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: baseGameContextValue,
        });

        const startedClockState = createMockChessClockState({ isPaused: false });
        const createStartedSpy = vi
            .spyOn(chessClockModule, 'createStartedClockState')
            .mockReturnValue(startedClockState);
        const createUpdatedSpy = vi.spyOn(chessClockModule, 'createUpdatedClockState');
        vi.spyOn(performance, 'now').mockReturnValue(2500);

        const firstMoveHistory = [createMoveRecordForColor('white')];
        const nextGameContextValue = createChessGameContextValue({
            moveHistory: firstMoveHistory,
            timelineVersion: 0,
        });

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: nextGameContextValue,
        });

        expect(createStartedSpy).toHaveBeenCalledTimes(1);
        expect(createStartedSpy).toHaveBeenCalledWith(clockState, 'black', 2500, 'white');
        expect(createUpdatedSpy).not.toHaveBeenCalled();
        expect(setClocks).toHaveBeenCalledWith(startedClockState);
    });

    it("resumes paused clocks on black's turn without increment", async () => {
        const clockState = createMockChessClockState({ isPaused: true });
        const setClocks = vi.fn();
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;
        chessClockContextValue.setClocks = setClocks;
        const existingHistory = [createMoveRecordForColor('white')];
        const initialGameContextValue = createChessGameContextValue({
            moveHistory: existingHistory,
            timelineVersion: 0,
        });

        const { rerenderChessClocksLocalController } = await renderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: initialGameContextValue,
        });

        const startedClockState = createMockChessClockState();
        const createStartedSpy = vi
            .spyOn(chessClockModule, 'createStartedClockState')
            .mockReturnValue(startedClockState);
        const createUpdatedSpy = vi.spyOn(chessClockModule, 'createUpdatedClockState');
        vi.spyOn(performance, 'now').mockReturnValue(5000);

        const nextHistory = [...existingHistory, createMoveRecordForColor('black')];
        const nextGameContextValue = createChessGameContextValue({
            moveHistory: nextHistory,
            timelineVersion: 0,
        });

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: nextGameContextValue,
        });

        expect(createStartedSpy).toHaveBeenCalledTimes(1);
        expect(createStartedSpy).toHaveBeenCalledWith(clockState, 'white', 5000, undefined);
        expect(createUpdatedSpy).not.toHaveBeenCalled();
        expect(setClocks).toHaveBeenCalledWith(startedClockState);
    });

    it('switches the active side and updates elapsed time for subsequent moves', async () => {
        const clockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 300000, isActive: true },
            black: { timeRemainingMs: 300000, isActive: false },
        });
        const setClocks = vi.fn();
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;
        chessClockContextValue.setClocks = setClocks;
        const existingHistory = [createMoveRecordForColor('white')];
        const initialGameContextValue = createChessGameContextValue({
            moveHistory: existingHistory,
            timelineVersion: 0,
        });

        const { rerenderChessClocksLocalController } = await renderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: initialGameContextValue,
        });

        const updatedClockState = createMockChessClockState();
        const createUpdatedSpy = vi
            .spyOn(chessClockModule, 'createUpdatedClockState')
            .mockReturnValue(updatedClockState);
        const createStartedSpy = vi.spyOn(chessClockModule, 'createStartedClockState');
        vi.spyOn(performance, 'now').mockReturnValue(8000);

        const nextHistory = [...existingHistory, createMoveRecordForColor('black')];
        const nextGameContextValue = createChessGameContextValue({
            moveHistory: nextHistory,
            timelineVersion: 0,
        });

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: nextGameContextValue,
        });

        expect(createUpdatedSpy).toHaveBeenCalledTimes(1);
        expect(createUpdatedSpy).toHaveBeenCalledWith(clockState, 8000, 'white');
        expect(createStartedSpy).not.toHaveBeenCalled();
        expect(setClocks).toHaveBeenCalledWith(updatedClockState);
    });

    it('pauses clocks once the game ends', async () => {
        const clockState = createMockChessClockState({ isPaused: false });
        const setClocks = vi.fn();
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;
        chessClockContextValue.setClocks = setClocks;
        const initialGameContextValue = createChessGameContextValue({
            status: 'in-progress',
        });

        const { rerenderChessClocksLocalController } = await renderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: initialGameContextValue,
        });

        const updatedClockState = createMockChessClockState();
        const pausedClockState = createMockChessClockState({ isPaused: true });
        const createUpdatedSpy = vi
            .spyOn(chessClockModule, 'createUpdatedClockState')
            .mockReturnValue(updatedClockState);
        const createPausedSpy = vi.spyOn(chessClockModule, 'createPausedClockState').mockReturnValue(pausedClockState);
        vi.spyOn(performance, 'now').mockReturnValue(12000);

        const completedGameContextValue = createChessGameContextValue({
            status: 'checkmate',
        });

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: completedGameContextValue,
        });

        expect(createUpdatedSpy).toHaveBeenCalledWith(clockState, 12000);
        expect(createPausedSpy).toHaveBeenCalledWith(updatedClockState);
        expect(setClocks).toHaveBeenCalledWith(pausedClockState);
    });

    it('resets clocks on new timelines and handles the first move after reset', async () => {
        const clockState = createMockChessClockState({ isPaused: true });
        const setClocks = vi.fn();
        const resetClocks = vi.fn();
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;
        chessClockContextValue.setClocks = setClocks;
        chessClockContextValue.resetClocks = resetClocks;
        const previousTimelineHistory = [createMoveRecordForColor('white')];
        const initialGameContextValue = createChessGameContextValue({
            moveHistory: previousTimelineHistory,
            timelineVersion: 0,
        });

        const { rerenderChessClocksLocalController } = await renderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: initialGameContextValue,
        });

        const resetGameContextValue = createChessGameContextValue({
            moveHistory: [],
            timelineVersion: 1,
        });

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: resetGameContextValue,
        });

        expect(resetClocks).toHaveBeenCalledTimes(1);

        const restartedGameContextValue = createChessGameContextValue({
            moveHistory: [createMoveRecordForColor('white')],
            timelineVersion: 1,
        });
        const startedClockState = createMockChessClockState();
        const createStartedSpy = vi
            .spyOn(chessClockModule, 'createStartedClockState')
            .mockReturnValue(startedClockState);
        vi.spyOn(performance, 'now').mockReturnValue(6400);

        rerenderChessClocksLocalController({
            chessClockContextValue,
            chessGameContextValue: restartedGameContextValue,
        });

        expect(createStartedSpy).toHaveBeenCalledWith(clockState, 'black', 6400, 'white');
        expect(setClocks).toHaveBeenCalledWith(startedClockState);
        expect(resetClocks).toHaveBeenCalledTimes(1);
    });

    it('starts ticking when clocks are active locally', async () => {
        const start = vi.fn();
        const clockTickContextValue = createMockClockTickContextValues();
        clockTickContextValue.start = start;
        clockTickContextValue.isRunning = false;
        const clockState = createMockChessClockState({
            isPaused: false,
            white: { timeRemainingMs: 300000, isActive: true },
            black: { timeRemainingMs: 300000, isActive: false },
        });
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;

        await renderChessClocksLocalController({
            chessClockContextValue,
            clockTickContextValue,
        });

        expect(start).toHaveBeenCalledTimes(1);
    });

    it('stops ticking immediately and on cleanup when clocks should be paused', async () => {
        const stop = vi.fn();
        const clockTickContextValue = createMockClockTickContextValues();
        clockTickContextValue.stop = stop;
        clockTickContextValue.isRunning = true;
        const clockState = createMockChessClockState({ isPaused: true });
        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;

        const { unmount } = await renderChessClocksLocalController({
            chessClockContextValue,
            clockTickContextValue,
        });

        expect(stop).toHaveBeenCalledTimes(1);

        stop.mockClear();
        unmount();

        expect(stop).toHaveBeenCalledTimes(1);
    });
});
