import { socket } from '../../socket';
import type { SocketContextType } from '../SocketProvider';

export function createMockSocketContextValues(overrides?: Partial<SocketContextType>): SocketContextType {
    return {
        socket,
        authenticateSocket: () => {},
        isConnected: false,
        isAuthenticated: false,
        ...overrides,
    };
}
