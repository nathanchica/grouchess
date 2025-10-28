import { useCallback, createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PieceColor } from '@grouchess/chess';
import type { TimeControl } from '@grouchess/game-room';
import invariant from 'tiny-invariant';

type ChessClock = {
    timeRemainingMs: number;
    isActive: boolean;
};

type ChessClockState = {
    white: ChessClock;
    black: ChessClock;
    lastUpdatedTimeMs: number | null;
    baseTimeMs: number;
    incrementMs: number;
    isPaused: boolean;
};

type ChessClockContextType = ChessClockState & {
    resetClocks: () => void;
    startClock: (color: PieceColor) => void;
    switchClock: (toColor: PieceColor) => void;
    stopClocks: () => void;
};

function createInitialState(timeControl?: TimeControl): ChessClockState {
    const baseTimeMs = timeControl?.minutes ? timeControl.minutes * 60 * 1000 : 0;
    const incrementMs = timeControl?.increment ? timeControl.increment * 1000 : 0;
    return {
        white: {
            timeRemainingMs: baseTimeMs,
            isActive: false,
        },
        black: {
            timeRemainingMs: baseTimeMs,
            isActive: false,
        },
        lastUpdatedTimeMs: null,
        baseTimeMs,
        incrementMs,
        isPaused: true,
    };
}

function createInitialContextValue(): ChessClockContextType {
    return {
        ...createInitialState(),
        resetClocks: () => {},
        startClock: () => {},
        switchClock: () => {},
        stopClocks: () => {},
    };
}

const ChessClockContext = createContext<ChessClockContextType>(createInitialContextValue());

export function useChessClock() {
    const context = useContext(ChessClockContext);
    invariant(context, 'useChessClock must be used within a ChessClockProvider');
    return context;
}

type Props = {
    timeControl: TimeControl | null;
    children: ReactNode;
};

function ChessClockProvider({ timeControl, children }: Props) {
    const [clockState, setClockState] = useState<ChessClockState>(createInitialState(timeControl ?? undefined));

    const resetClocks = useCallback(() => {
        setClockState(createInitialState(timeControl ?? undefined));
    }, [timeControl]);

    const startClock = useCallback((color: PieceColor) => {
        setClockState((prevState) => ({
            ...prevState,
            [color]: {
                ...prevState[color],
                isActive: true,
            },
            isPaused: false,
            lastUpdatedTimeMs: performance.now(),
        }));
    }, []);

    const switchClock = useCallback((toColor: PieceColor) => {
        setClockState((prevState) => {
            if (prevState.isPaused) {
                return prevState;
            }
            const fromColor = toColor === 'white' ? 'black' : 'white';
            const now = performance.now();
            const elapsedMs = prevState.lastUpdatedTimeMs ? now - prevState.lastUpdatedTimeMs : 0;
            const newFromTime = Math.max(prevState[fromColor].timeRemainingMs - elapsedMs, 0) + prevState.incrementMs;

            return {
                ...prevState,
                [fromColor]: {
                    timeRemainingMs: newFromTime,
                    isActive: false,
                },
                [toColor]: {
                    ...prevState[toColor],
                    isActive: true,
                },
                lastUpdatedTimeMs: now,
            };
        });
    }, []);

    const stopClocks = useCallback(() => {
        setClockState((prevState) => {
            const now = performance.now();
            const elapsedMs = prevState.lastUpdatedTimeMs ? now - prevState.lastUpdatedTimeMs : 0;

            let activeColor: PieceColor | null = null;
            if (prevState.white.isActive) activeColor = 'white';
            else if (prevState.black.isActive) activeColor = 'black';

            let activeColorState: Partial<Pick<ChessClockState, 'white' | 'black'>> = {};
            if (activeColor) {
                const newActiveTime = Math.max(prevState[activeColor].timeRemainingMs - elapsedMs, 0);
                activeColorState = {
                    [activeColor]: {
                        ...prevState[activeColor],
                        timeRemainingMs: newActiveTime,
                    },
                };
            }

            return {
                ...prevState,
                isPaused: true,
                lastUpdatedTimeMs: null,
                ...activeColorState,
            };
        });
    }, []);

    const contextValue: ChessClockContextType = useMemo(() => {
        return {
            ...clockState,
            resetClocks,
            startClock,
            switchClock,
            stopClocks,
        };
    }, [clockState, resetClocks, startClock, switchClock, stopClocks]);

    return <ChessClockContext.Provider value={contextValue}>{children}</ChessClockContext.Provider>;
}

export default ChessClockProvider;
