import type { SocketType } from '../../socket';
import type { SocketContextType } from '../SocketProvider';

export function createMockSocketContextValues(overrides?: Partial<SocketContextType>): SocketContextType {
    return {
        socket: {
            emit: () => {},
            on: () => {},
            off: () => {},
        } as unknown as SocketType,
        authenticateSocket: () => {},
        isConnected: false,
        isAuthenticated: false,
        ...overrides,
    };
}
