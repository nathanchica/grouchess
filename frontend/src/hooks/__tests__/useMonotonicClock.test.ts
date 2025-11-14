import { renderHook } from 'vitest-browser-react';

import { useMonotonicClock } from '../useMonotonicClock';

describe('useMonotonicClock', () => {
    let mockTime = 0;
    let rafCallbacks: Map<number, FrameRequestCallback> = new Map();
    let rafId = 0;

    beforeEach(() => {
        mockTime = 0;
        rafCallbacks = new Map();
        rafId = 0;

        // Mock performance.now()
        vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

        // Mock requestAnimationFrame
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
            rafId++;
            rafCallbacks.set(rafId, callback);
            return rafId;
        });

        // Mock cancelAnimationFrame
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
            rafCallbacks.delete(id);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const flushAnimationFrame = async () => {
        // Get the current callbacks (before they schedule new ones)
        const currentCallbacks = Array.from(rafCallbacks.entries());

        // Execute each callback (which will schedule new ones)
        for (const [id, callback] of currentCallbacks) {
            rafCallbacks.delete(id);
            callback(mockTime);
        }

        // Wait for React state updates to propagate
        await vi.waitFor(() => {});
    };

    it('starts tracking elapsedMs when start is called', async () => {
        const { result } = await renderHook(() => useMonotonicClock());

        expect(result.current.elapsedMs).toBe(0);

        // Start the clock at time 1000ms
        mockTime = 1000;
        result.current.start();

        // Initial update should set elapsedMs to 0 (1000 - 1000)
        expect(result.current.elapsedMs).toBe(0);

        // Advance time to 1500ms
        mockTime = 1500;
        await flushAnimationFrame();

        // Wait for elapsedMs to be 500ms (1500 - 1000)
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(500));

        // Advance time to 2000ms
        mockTime = 2000;
        await flushAnimationFrame();

        // Wait for elapsedMs to be 1000ms (2000 - 1000)
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(1000));
    });

    it('stops tracking and cancels animation frames when stop is called', async () => {
        const { result } = await renderHook(() => useMonotonicClock());

        // Start the clock
        mockTime = 1000;
        result.current.start();

        // Advance time
        mockTime = 1500;
        await flushAnimationFrame();
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(500));

        // Stop the clock
        mockTime = 2000;
        result.current.stop();

        // Animation frames should be cancelled
        expect(window.cancelAnimationFrame).toHaveBeenCalled();

        // Wait for stop() to update the state to 1000ms (2000 - 1000)
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(1000));

        // Advance time further
        mockTime = 3000;
        await flushAnimationFrame();

        // elapsedMs should remain at 1000ms (stopped at 2000ms, started at 1000ms)
        expect(result.current.elapsedMs).toBe(1000);
    });

    it('retains the final elapsedMs value after stopping', async () => {
        const { result } = await renderHook(() => useMonotonicClock());

        mockTime = 1000;
        result.current.start();

        mockTime = 2500;
        await flushAnimationFrame();
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(1500));

        // Stop at 3000ms
        mockTime = 3000;
        result.current.stop();

        // Wait for elapsedMs to be 2000ms (3000 - 1000)
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(2000));

        // Advance time further and verify it doesn't change
        mockTime = 5000;
        await flushAnimationFrame();

        expect(result.current.elapsedMs).toBe(2000);
    });

    it('resets elapsedMs to zero when reset is invoked', async () => {
        const { result } = await renderHook(() => useMonotonicClock());

        // Start and run the clock
        mockTime = 1000;
        result.current.start();

        mockTime = 2000;
        await flushAnimationFrame();
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(1000));

        // Stop the clock
        result.current.stop();

        // Reset should set elapsedMs to 0
        result.current.reset();
        await vi.waitFor(() => expect(result.current.elapsedMs).toBe(0));
    });

    it('cleans up the animation frame on unmount', async () => {
        const { result, unmount } = await renderHook(() => useMonotonicClock());

        // Start the clock
        mockTime = 1000;
        result.current.start();

        mockTime = 1500;
        await flushAnimationFrame();

        // Unmount the component
        unmount();

        // cancelAnimationFrame should have been called during cleanup
        expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });
});
