import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

type ClockTickContextType = {
    nowMs: number;
    start: () => void;
    stop: () => void;
    isRunning: boolean;
};

const ClockTickContext = createContext<ClockTickContextType | null>(null);

export function useClockTick(): ClockTickContextType {
    const context = useContext(ClockTickContext);
    invariant(context, 'useClockTick must be used within ClockTickProvider');
    return context;
}

type Props = {
    children: ReactNode;
};

function ClockTickProvider({ children }: Props) {
    const [nowMs, setNowMs] = useState<number>(0);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const rafId = useRef<number | null>(null);

    const start = useCallback(() => {
        // Seed nowMs on start to avoid a 0 baseline before the first RAF
        setNowMs(performance.now());
        setIsRunning(true);
    }, []);

    const stop = useCallback(() => {
        setIsRunning(false);
    }, []);

    useEffect(() => {
        if (!isRunning) return;
        const tick = () => {
            setNowMs(performance.now());
            rafId.current = requestAnimationFrame(tick);
        };
        rafId.current = requestAnimationFrame(tick);
        return () => {
            if (rafId.current) cancelAnimationFrame(rafId.current);
            rafId.current = null;
        };
    }, [isRunning]);

    const value = useMemo(() => ({ nowMs, start, stop, isRunning }), [isRunning, nowMs, start, stop]);

    return <ClockTickContext.Provider value={value}>{children}</ClockTickContext.Provider>;
}

export default ClockTickProvider;
