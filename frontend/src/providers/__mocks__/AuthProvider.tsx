import type { AuthContextType } from '../AuthProvider';

export function createMockAuthContextValues(overrides?: Partial<AuthContextType>): AuthContextType {
    return {
        roomId: null,
        playerId: null,
        token: null,
        loadData: () => {},
        clearAuth: () => {},
        ...overrides,
    };
}
