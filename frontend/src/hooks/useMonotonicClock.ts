import { useCallback, useState, useEffect, useRef } from 'react';

/**
 * A hook that provides a monotonic clock for measuring elapsed time
 */
export function useMonotonicClock() {
    const [elapsedMs, setElapsedMs] = useState(0);
    const startTime = useRef<number | null>(null);
    const animationFrame = useRef<number | null>(null);

    const start = useCallback(() => {
        startTime.current = performance.now();
        const updateClock = () => {
            if (startTime.current !== null) {
                setElapsedMs(performance.now() - startTime.current);
                animationFrame.current = requestAnimationFrame(updateClock);
            }
        };
        updateClock();
    }, []);

    const stop = useCallback(() => {
        if (animationFrame.current) {
            cancelAnimationFrame(animationFrame.current);
            animationFrame.current = null;
        }
        if (startTime.current !== null) {
            setElapsedMs(performance.now() - startTime.current);
        }
        startTime.current = null;
    }, []);

    const reset = useCallback(() => {
        setElapsedMs(0);
        startTime.current = null;
    }, []);

    useEffect(() => {
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    return { elapsedMs, start, stop, reset };
}
