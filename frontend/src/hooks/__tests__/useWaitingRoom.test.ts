import type { WaitingRoom } from '@grouchess/models';
import { useLocation } from 'react-router';
import type { Mock } from 'vitest';
import { renderHook } from 'vitest-browser-react';

import { useAuth } from '../../providers/AuthProvider';
import { useSocket, type SocketContextType } from '../../providers/SocketProvider';
import { createMockAuthContextValues } from '../../providers/__mocks__/AuthProvider';
import type { SocketType } from '../../socket';
import * as windowUtils from '../../utils/window';
import { useWaitingRoom } from '../useWaitingRoom';

vi.mock('react-router', () => ({
    useLocation: vi.fn(),
}));

vi.mock('../../providers/SocketProvider', async () => {
    return {
        ...(await vi.importActual('../../providers/SocketProvider')),
        useSocket: vi.fn(),
    };
});

vi.mock('../../providers/AuthProvider', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../../utils/window', { spy: true });

const useLocationMock = vi.mocked(useLocation);
const useSocketMock = vi.mocked(useSocket);
const useAuthMock = vi.mocked(useAuth);

const roomId = 'room-123';
const sessionStorageKey = `room:${roomId}`;

const mockWaitingRoomData: WaitingRoom = {
    roomId,
    playerId: 'player-456',
    token: 'token-789',
    isCreator: true,
};

function createMockSocketContext(
    overrides: {
        socket?: Partial<SocketType>;
        authenticateSocket?: ReturnType<typeof vi.fn>;
        isConnected?: boolean;
        isAuthenticated?: boolean;
    } = {}
): SocketContextType {
    return {
        socket: (overrides.socket || { emit: vi.fn() }) as SocketType,
        authenticateSocket: overrides.authenticateSocket || vi.fn(),
        isConnected: overrides.isConnected ?? true,
        isAuthenticated: overrides.isAuthenticated ?? false,
    } as SocketContextType;
}

describe('useWaitingRoom', () => {
    let getStoredValueSpy: Mock<typeof windowUtils.getStoredValue>;
    let setStoredValueSpy: Mock<typeof windowUtils.setStoredValue>;

    beforeEach(() => {
        getStoredValueSpy = vi.spyOn(windowUtils, 'getStoredValue').mockReturnValue(null);
        setStoredValueSpy = vi.spyOn(windowUtils, 'setStoredValue').mockImplementation(() => {});
        useLocationMock.mockReturnValue({ state: null } as ReturnType<typeof useLocation>);
        useSocketMock.mockReturnValue(createMockSocketContext());
        useAuthMock.mockReturnValue(createMockAuthContextValues());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('initializes waitingRoomData from location state when available', async () => {
        useLocationMock.mockReturnValue({ state: mockWaitingRoomData } as ReturnType<typeof useLocation>);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(result.current.waitingRoomData).toEqual(mockWaitingRoomData);
        expect(getStoredValueSpy).not.toHaveBeenCalled();
    });

    it('loads waitingRoomData from session storage when location state is absent', async () => {
        useLocationMock.mockReturnValue({ state: null } as ReturnType<typeof useLocation>);
        getStoredValueSpy.mockReturnValue(mockWaitingRoomData);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(getStoredValueSpy).toHaveBeenCalledWith('sessionStorage', sessionStorageKey, null);
        expect(result.current.waitingRoomData).toEqual(mockWaitingRoomData);
    });

    it('ignores invalid session storage data and leaves waitingRoomData null', async () => {
        useLocationMock.mockReturnValue({ state: null } as ReturnType<typeof useLocation>);
        const invalidData = { invalid: 'data' };
        getStoredValueSpy.mockReturnValue(invalidData);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(result.current.waitingRoomData).toBeNull();
    });

    it('updates state when loadData is called with a valid waiting room object', async () => {
        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(result.current.waitingRoomData).toBeNull();

        result.current.loadData(mockWaitingRoomData);

        await vi.waitFor(() => expect(result.current.waitingRoomData).toEqual(mockWaitingRoomData));
    });

    it('does not update state when loadData is called with invalid data', async () => {
        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(result.current.waitingRoomData).toBeNull();

        result.current.loadData({ invalid: 'data' });

        await vi.waitFor(() => expect(result.current.waitingRoomData).toBeNull());
    });

    it('authenticates the socket and emits wait_for_game when waitingRoomData is set', async () => {
        const socketEmitSpy = vi.fn();
        const authenticateSocketSpy = vi.fn((_token, onAuthenticated) => {
            onAuthenticated?.();
        });

        useSocketMock.mockReturnValue(
            createMockSocketContext({
                socket: { emit: socketEmitSpy },
                authenticateSocket: authenticateSocketSpy,
                isAuthenticated: false,
            })
        );

        useLocationMock.mockReturnValue({ state: mockWaitingRoomData } as ReturnType<typeof useLocation>);

        await renderHook(() => useWaitingRoom(roomId));

        await vi.waitFor(() => {
            expect(authenticateSocketSpy).toHaveBeenCalledWith(mockWaitingRoomData.token, expect.any(Function));
            expect(socketEmitSpy).toHaveBeenCalledWith('wait_for_game');
        });
    });

    it('does not authenticate when socket is already authenticated', async () => {
        const authenticateSocketSpy = vi.fn();

        useSocketMock.mockReturnValue(
            createMockSocketContext({
                authenticateSocket: authenticateSocketSpy,
                isAuthenticated: true,
            })
        );

        useLocationMock.mockReturnValue({ state: mockWaitingRoomData } as ReturnType<typeof useLocation>);

        await renderHook(() => useWaitingRoom(roomId));

        await vi.waitFor(() => expect(authenticateSocketSpy).not.toHaveBeenCalled());
    });

    it('persists waitingRoomData to session storage and auth context when it changes', async () => {
        const loadAuthDataSpy = vi.fn();
        const authContextValues = createMockAuthContextValues();
        authContextValues.loadData = loadAuthDataSpy;
        useAuthMock.mockReturnValue(authContextValues);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        result.current.loadData(mockWaitingRoomData);

        await vi.waitFor(() => {
            expect(setStoredValueSpy).toHaveBeenCalledWith('sessionStorage', sessionStorageKey, mockWaitingRoomData);
            expect(loadAuthDataSpy).toHaveBeenCalledWith({
                roomId: mockWaitingRoomData.roomId,
                playerId: mockWaitingRoomData.playerId,
                token: mockWaitingRoomData.token,
            });
        });
    });

    it('avoids emitting wait_for_game more than once per mount', async () => {
        const socketEmitSpy = vi.fn();
        const authenticateSocketSpy = vi.fn((_token, onAuthenticated) => {
            onAuthenticated?.();
        });

        useSocketMock.mockReturnValue(
            createMockSocketContext({
                socket: { emit: socketEmitSpy },
                authenticateSocket: authenticateSocketSpy,
                isAuthenticated: false,
            })
        );

        useLocationMock.mockReturnValue({ state: mockWaitingRoomData } as ReturnType<typeof useLocation>);

        const { rerender } = await renderHook(() => useWaitingRoom(roomId));

        await vi.waitFor(() => expect(socketEmitSpy).toHaveBeenCalledOnce());

        // Trigger re-render
        await rerender();

        // Should still only have been called once
        expect(socketEmitSpy).toHaveBeenCalledOnce();
    });

    it('does not emit wait_for_game on subsequent authentication callback calls', async () => {
        const socketEmitSpy = vi.fn();
        let storedCallback: (() => void) | undefined;
        const authenticateSocketSpy = vi.fn((_token, onAuthenticated) => {
            storedCallback = onAuthenticated;
            onAuthenticated?.();
        });

        useSocketMock.mockReturnValue(
            createMockSocketContext({
                socket: { emit: socketEmitSpy },
                authenticateSocket: authenticateSocketSpy,
                isAuthenticated: false,
            })
        );

        useLocationMock.mockReturnValue({ state: mockWaitingRoomData } as ReturnType<typeof useLocation>);

        await renderHook(() => useWaitingRoom(roomId));

        await vi.waitFor(() => expect(socketEmitSpy).toHaveBeenCalledOnce());

        // Simulate the callback being called again (e.g., due to socket reconnect)
        storedCallback?.();

        // Should still only have been called once
        expect(socketEmitSpy).toHaveBeenCalledOnce();
    });

    it('prefers location state over session storage when both are available', async () => {
        const locationData: WaitingRoom = {
            roomId: 'room-from-location',
            playerId: 'player-from-location',
            token: 'token-from-location',
        };

        const sessionData: WaitingRoom = {
            roomId: 'room-from-session',
            playerId: 'player-from-session',
            token: 'token-from-session',
        };

        useLocationMock.mockReturnValue({ state: locationData } as ReturnType<typeof useLocation>);
        getStoredValueSpy.mockReturnValue(sessionData);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(result.current.waitingRoomData).toEqual(locationData);
        expect(getStoredValueSpy).not.toHaveBeenCalled();
    });

    it('handles invalid location state and falls back to session storage', async () => {
        const invalidLocationData = { invalid: 'data' };

        useLocationMock.mockReturnValue({ state: invalidLocationData } as ReturnType<typeof useLocation>);
        getStoredValueSpy.mockReturnValue(mockWaitingRoomData);

        const { result } = await renderHook(() => useWaitingRoom(roomId));

        expect(getStoredValueSpy).toHaveBeenCalledWith('sessionStorage', sessionStorageKey, null);
        expect(result.current.waitingRoomData).toEqual(mockWaitingRoomData);
    });
});
