import { useCallback, createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { ChessClockState } from '@grouchess/chess';
import type { TimeControl } from '@grouchess/game-room';
import type { ClockUpdatePayload } from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { useSocket } from './SocketProvider';

type ChessClockContextType = ChessClockState & {
    setClocks: (clockState: ChessClockState | null) => void;
};

export function createInitialChessClockState(timeControl?: TimeControl): ChessClockState {
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
        ...createInitialChessClockState(),
        setClocks: () => {},
    };
}

const ChessClockContext = createContext<ChessClockContextType>(createInitialContextValue());

export function useChessClock() {
    const context = useContext(ChessClockContext);
    invariant(context, 'useChessClock must be used within a ChessClockProvider');
    return context;
}

type Props = {
    initialState: ChessClockState | null;
    children: ReactNode;
};

function ChessClockProvider({ initialState, children }: Props) {
    const { socket } = useSocket();
    const [clockState, setClockState] = useState<ChessClockState>(initialState || createInitialChessClockState());

    const setClocks = useCallback((clockState: ChessClockState | null) => {
        setClockState(clockState || createInitialChessClockState());
    }, []);

    const onClockUpdate = useCallback(
        ({ clockState }: ClockUpdatePayload) => {
            setClocks(clockState);
        },
        [setClocks]
    );

    useEffect(() => {
        socket.on('clock_update', onClockUpdate);

        return () => {
            socket.off('clock_update', onClockUpdate);
        };
    }, [onClockUpdate, socket]);

    const contextValue: ChessClockContextType = useMemo(() => {
        return {
            ...clockState,
            setClocks,
        };
    }, [clockState, setClocks]);

    return <ChessClockContext.Provider value={contextValue}>{children}</ChessClockContext.Provider>;
}

export default ChessClockProvider;
