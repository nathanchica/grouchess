import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { AuthenticatedPayload, ErrorEventPayload } from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { socket, type SocketType } from '../socket';

type SocketContextType = {
    socket: SocketType;
    authenticateSocket: (token: string, onAuthenticated?: ({ playerId }: { playerId: string }) => void) => void;
    isConnected: boolean;
    isAuthenticated: boolean;
};

export const defaultSocketContextValue: SocketContextType = {
    socket,
    authenticateSocket: () => {},
    isConnected: false,
    isAuthenticated: false,
};

const SocketContext = createContext<SocketContextType>(defaultSocketContextValue);

export function useSocket() {
    const context = useContext(SocketContext);
    invariant(context, 'useSocket must be used within a SocketProvider');
    return context;
}

type Props = {
    children: ReactNode;
};

function SocketProvider({ children }: Props) {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const authenticateSocket = useCallback(
        (token: string, onAuthenticated?: ({ playerId }: AuthenticatedPayload) => void) => {
            socket.once('authenticated', ({ playerId }) => {
                setIsAuthenticated(true);
                onAuthenticated?.({ playerId });
            });
            socket.auth = { token };
            socket.connect();
        },
        []
    );

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
            setIsAuthenticated(false);
        }

        function onError({ message }: ErrorEventPayload) {
            // TODO: handle error appropriately
            console.error('Socket error:', message);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('error', onError);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('error', onError);
            socket.disconnect();
        };
    }, []);

    const contextValue = useMemo(
        () => ({
            socket,
            authenticateSocket,
            isConnected,
            isAuthenticated,
        }),
        [authenticateSocket, isConnected, isAuthenticated]
    );

    return <SocketContext.Provider value={contextValue}>{children}</SocketContext.Provider>;
}

export default SocketProvider;
