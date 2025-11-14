import type { ClockUpdatePayload } from '@grouchess/socket-events';
import { createMockChessClockState } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessClockContext, type ChessClockContextType } from '../../../providers/ChessGameRoomProvider';
import { ClockTickContext, type ClockTickContextType } from '../../../providers/ClockTickProvider';
import { SocketContext, type SocketContextType } from '../../../providers/SocketProvider';
import { createMockChessClockContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockClockTickContextValues } from '../../../providers/__mocks__/ClockTickProvider';
import { createMockSocketContextValues } from '../../../providers/__mocks__/SocketProvider';
import type { SocketType } from '../../../socket';
import * as clockUtilsModule from '../../../utils/clock';
import ChessClocksSocketController from '../ChessClocksSocketController';

vi.mock('../../../utils/clock', { spy: true });
vi.mock('../../../hooks/useTimeoutDetection', () => ({
    useTimeoutDetection: vi.fn(),
}));

type RenderChessClocksSocketControllerOptions = {
    socketContextValue?: SocketContextType;
    clockTickContextValue?: ClockTickContextType;
    chessClockContextValue?: ChessClockContextType;
};

function createDefaultChessClockContextValue(): ChessClockContextType {
    const clockState = createMockChessClockState();
    clockState.isPaused = true;
    const chessClockContextValue = createMockChessClockContextValues();
    chessClockContextValue.clockState = clockState;
    return chessClockContextValue;
}

async function renderChessClocksSocketController({
    socketContextValue = createMockSocketContextValues(),
    clockTickContextValue = createMockClockTickContextValues(),
    chessClockContextValue = createDefaultChessClockContextValue(),
}: RenderChessClocksSocketControllerOptions = {}) {
    return render(
        <SocketContext.Provider value={socketContextValue}>
            <ClockTickContext.Provider value={clockTickContextValue}>
                <ChessClockContext.Provider value={chessClockContextValue}>
                    <ChessClocksSocketController />
                </ChessClockContext.Provider>
            </ClockTickContext.Provider>
        </SocketContext.Provider>
    );
}

describe('ChessClocksSocketController', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('subscribes to clock_update events and cleans up on unmount', async () => {
        const socketOn = vi.fn();
        const socketOff = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: socketOff,
        } as unknown as SocketType;

        const { unmount } = await renderChessClocksSocketController({ socketContextValue });

        expect(socketOn).toHaveBeenCalledTimes(1);
        expect(socketOn).toHaveBeenCalledWith('clock_update', expect.any(Function));

        const handler = socketOn.mock.calls[0][1];
        expect(socketOff).not.toHaveBeenCalled();

        unmount();

        expect(socketOff).toHaveBeenCalledTimes(1);
        expect(socketOff).toHaveBeenCalledWith('clock_update', handler);
    });

    it.each([
        { scenario: 'white is active', activeColor: 'white' as const },
        { scenario: 'black is active', activeColor: 'black' as const },
    ])('re-bases server clocks before updating state when $scenario', async ({ activeColor }) => {
        const rebasedClockState = createMockChessClockState();
        rebasedClockState[activeColor].isActive = true;
        const payloadClockState = createMockChessClockState();
        payloadClockState[activeColor].isActive = true;

        const setClocks = vi.fn();
        const rebaseSpy = vi.spyOn(clockUtilsModule, 'rebaseServerClockToPerf').mockReturnValue(rebasedClockState);
        const controllerClockState = createMockChessClockState();
        controllerClockState.isPaused = true;

        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = controllerClockState;
        chessClockContextValue.setClocks = setClocks;

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        await renderChessClocksSocketController({ socketContextValue, chessClockContextValue });

        const handler = socketOn.mock.calls[0][1];
        const payload: ClockUpdatePayload = { clockState: payloadClockState };
        handler(payload);

        expect(rebaseSpy).toHaveBeenCalledWith(payloadClockState);
        expect(setClocks).toHaveBeenCalledWith(rebasedClockState);
    });

    it('sets clocks to null when server provides no clock state', async () => {
        const setClocks = vi.fn();
        const rebaseSpy = vi.spyOn(clockUtilsModule, 'rebaseServerClockToPerf');
        const controllerClockState = createMockChessClockState();
        controllerClockState.isPaused = true;

        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = controllerClockState;
        chessClockContextValue.setClocks = setClocks;

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        await renderChessClocksSocketController({ socketContextValue, chessClockContextValue });

        const handler = socketOn.mock.calls[0][1];
        handler({ clockState: null });

        expect(rebaseSpy).not.toHaveBeenCalled();
        expect(setClocks).toHaveBeenCalledWith(null);
    });

    it.each([
        { scenario: 'white is active', activeColor: 'white' as const },
        { scenario: 'black is active', activeColor: 'black' as const },
    ])('starts clock ticks when $scenario should be counting down', async ({ activeColor }) => {
        const start = vi.fn();
        const clockTickContextValue = createMockClockTickContextValues();
        clockTickContextValue.start = start;
        clockTickContextValue.isRunning = false;

        const clockState = createMockChessClockState();
        clockState.isPaused = false;
        clockState[activeColor].isActive = true;

        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;

        await renderChessClocksSocketController({ clockTickContextValue, chessClockContextValue });

        expect(start).toHaveBeenCalledTimes(1);
    });

    it.each([
        { scenario: 'white is active', activeColor: 'white' as const },
        { scenario: 'black is active', activeColor: 'black' as const },
    ])('stops ticking immediately when clocks are paused while $scenario', async ({ activeColor }) => {
        const stop = vi.fn();
        const clockTickContextValue = createMockClockTickContextValues();
        clockTickContextValue.stop = stop;
        clockTickContextValue.isRunning = true;

        const clockState = createMockChessClockState();
        clockState.isPaused = true;
        clockState[activeColor].isActive = true;

        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;

        const { unmount } = await renderChessClocksSocketController({
            clockTickContextValue,
            chessClockContextValue,
        });

        expect(stop).toHaveBeenCalledTimes(1);

        stop.mockClear();
        unmount();
        expect(stop).toHaveBeenCalledTimes(1);
    });

    it.each([
        { scenario: 'white is active', activeColor: 'white' as const },
        { scenario: 'black is active', activeColor: 'black' as const },
    ])('cleans up ticking when unmounted while the shared clock is running and $scenario', async ({ activeColor }) => {
        const stop = vi.fn();
        const clockTickContextValue = createMockClockTickContextValues();
        clockTickContextValue.stop = stop;
        clockTickContextValue.isRunning = true;

        const clockState = createMockChessClockState();
        clockState.isPaused = false;
        clockState[activeColor].isActive = true;

        const chessClockContextValue = createMockChessClockContextValues();
        chessClockContextValue.clockState = clockState;

        const { unmount } = await renderChessClocksSocketController({
            clockTickContextValue,
            chessClockContextValue,
        });

        expect(stop).not.toHaveBeenCalled();

        unmount();

        expect(stop).toHaveBeenCalledTimes(1);
    });
});
