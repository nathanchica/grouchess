import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import ClockTickProvider, { useClockTick } from '../ClockTickProvider';

const ClockTickConsumer = () => {
    const { nowMs, isRunning, start, stop } = useClockTick();

    return (
        <div data-testid="clock-tick-consumer">
            <span data-testid="now-ms">{nowMs}</span>
            <span data-testid="is-running">{isRunning ? 'true' : 'false'}</span>
            <button data-testid="start-button" onClick={start}>
                Start
            </button>
            <button data-testid="stop-button" onClick={stop}>
                Stop
            </button>
        </div>
    );
};

type RenderClockTickProviderOptions = {
    children?: ReactNode;
};

function renderClockTickProvider({ children = <ClockTickConsumer /> }: RenderClockTickProviderOptions = {}) {
    return render(<ClockTickProvider>{children}</ClockTickProvider>);
}

describe('ClockTickProvider', () => {
    let nowValue: number;
    let frameCallbacks: Map<number, FrameRequestCallback>;
    let nextFrameId: number;
    let lastFrameId: number | null;
    let requestAnimationFrameSpy: ReturnType<typeof vi.fn>;
    let cancelAnimationFrameSpy: ReturnType<typeof vi.fn>;

    const runAnimationFrame = (frameId?: number) => {
        const idToRun = frameId ?? lastFrameId;
        if (!idToRun) throw new Error('No animation frame scheduled');
        const callback = frameCallbacks.get(idToRun);
        if (!callback) throw new Error(`No callback stored for frame ${idToRun}`);

        frameCallbacks.delete(idToRun);
        callback(performance.now());
    };

    beforeEach(() => {
        nowValue = 0;
        frameCallbacks = new Map();
        nextFrameId = 1;
        lastFrameId = null;

        vi.spyOn(performance, 'now').mockImplementation(() => nowValue);

        requestAnimationFrameSpy = vi.fn((callback: FrameRequestCallback) => {
            const frameId = nextFrameId++;
            frameCallbacks.set(frameId, callback);
            lastFrameId = frameId;
            return frameId;
        });

        cancelAnimationFrameSpy = vi.fn((frameId: number) => {
            frameCallbacks.delete(frameId);
        });

        vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy);
        vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
    });

    it('cancels nothing when unmounted before starting', async () => {
        const { unmount } = await renderClockTickProvider();

        unmount();

        expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
        expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    });

    it('provides default clock values before ticking', async () => {
        const { getByTestId } = await renderClockTickProvider();

        const nowMs = getByTestId('now-ms');
        const isRunning = getByTestId('is-running');

        await expect.element(nowMs).toHaveTextContent('0');
        await expect.element(isRunning).toHaveTextContent('false');
    });

    it('starts ticking and seeds nowMs from performance.now', async () => {
        const { getByTestId } = await renderClockTickProvider();

        const startButton = getByTestId('start-button');
        nowValue = 1234;
        await startButton.click();

        const nowMs = getByTestId('now-ms');
        const isRunning = getByTestId('is-running');

        await vi.waitFor(() => {
            expect(nowMs).toHaveTextContent('1234');
        });
        await vi.waitFor(() => {
            expect(isRunning).toHaveTextContent('true');
        });
        await vi.waitFor(() => {
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
        });
    });

    it('updates nowMs on each animation frame while running', async () => {
        const { getByTestId } = await renderClockTickProvider();

        const startButton = getByTestId('start-button');
        nowValue = 500;
        await startButton.click();

        await vi.waitFor(() => {
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
        });
        const firstFrameId = lastFrameId;
        if (firstFrameId === null) throw new Error('Expected an animation frame to be scheduled');

        nowValue = 2000;
        runAnimationFrame(firstFrameId);

        const nowMs = getByTestId('now-ms');
        await vi.waitFor(() => {
            expect(nowMs).toHaveTextContent('2000');
        });
        await vi.waitFor(() => {
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
        });
    });

    it('stops ticking and cancels pending animation frames', async () => {
        const { getByTestId } = await renderClockTickProvider();

        const startButton = getByTestId('start-button');
        await startButton.click();

        await vi.waitFor(() => {
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
        });
        const scheduledFrameId = lastFrameId;
        if (scheduledFrameId === null) throw new Error('Expected an animation frame to be scheduled');

        const stopButton = getByTestId('stop-button');
        await stopButton.click();

        await vi.waitFor(() => {
            expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(scheduledFrameId);
        });
        const isRunning = getByTestId('is-running');
        await vi.waitFor(() => {
            expect(isRunning).toHaveTextContent('false');
        });
    });

    it('cancels animation frame when unmounted while running', async () => {
        const { getByTestId, unmount } = await renderClockTickProvider();

        const startButton = getByTestId('start-button');
        await startButton.click();

        await vi.waitFor(() => {
            expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(1);
        });
        const scheduledFrameId = lastFrameId;
        if (scheduledFrameId === null) throw new Error('Expected an animation frame to be scheduled');

        unmount();

        await vi.waitFor(() => {
            expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(scheduledFrameId);
        });
    });
});

describe('useClockTick', () => {
    it('provides context values when used inside ClockTickProvider', async () => {
        const { getByTestId } = await renderClockTickProvider();
        const consumer = getByTestId('clock-tick-consumer');
        await expect.element(consumer).toBeInTheDocument();
    });

    it('throws when used outside ClockTickProvider', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<ClockTickConsumer />);
        }).rejects.toThrow('useClockTick must be used within ClockTickProvider');
    });
});
