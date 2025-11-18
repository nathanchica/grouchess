import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import type { SocketType } from '../../socket';
import SocketProvider, { type SocketContextType, useSocket } from '../SocketProvider';

type MockSocket = {
    connected: boolean;
    auth: Record<string, unknown>;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    once: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
};

function createMockSocket(): MockSocket {
    return {
        connected: false,
        auth: {},
        on: vi.fn(),
        off: vi.fn(),
        once: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
    };
}

const { mockSocket } = vi.hoisted(() => ({
    mockSocket: createMockSocket(),
}));

vi.mock('../../socket', () => ({
    socket: mockSocket as unknown as SocketType,
}));

function resetMockSocket({ connected = false }: { connected?: boolean } = {}) {
    mockSocket.connected = connected;
    mockSocket.auth = {};
    mockSocket.on = vi.fn();
    mockSocket.off = vi.fn();
    mockSocket.once = vi.fn();
    mockSocket.connect = vi.fn();
    mockSocket.disconnect = vi.fn();
}

type SocketConsumerProps = {
    onRender?: (context: SocketContextType) => void;
};

const SocketConsumer = ({ onRender }: SocketConsumerProps = {}) => {
    const context = useSocket();
    onRender?.(context);

    return (
        <div data-testid="socket-consumer">
            <span data-testid="has-socket">{context.socket ? 'true' : 'false'}</span>
            <span data-testid="is-connected">{context.isConnected ? 'true' : 'false'}</span>
            <span data-testid="is-authenticated">{context.isAuthenticated ? 'true' : 'false'}</span>
        </div>
    );
};

type RenderSocketProviderOptions = {
    consumerProps?: SocketConsumerProps;
    children?: ReactNode;
};

async function renderSocketProvider({ consumerProps = {}, children }: RenderSocketProviderOptions = {}) {
    const getContent = () => children ?? <SocketConsumer {...consumerProps} />;
    const result = await render(<SocketProvider>{getContent()}</SocketProvider>);

    return {
        ...result,
        rerenderProvider: () => result.rerender(<SocketProvider>{getContent()}</SocketProvider>),
    };
}

function createContextTracker() {
    let currentContext: SocketContextType | null = null;
    let renderCount = 0;

    return {
        handleRender: (context: SocketContextType) => {
            currentContext = context;
            renderCount += 1;
        },
        getContext: () => currentContext,
        getRenderCount: () => renderCount,
    };
}

describe('SocketProvider', () => {
    beforeEach(() => {
        resetMockSocket();
    });

    it('provides socket, isConnected, isAuthenticated and authenticateSocket via context', async () => {
        const tracker = createContextTracker();
        const { getByTestId } = await renderSocketProvider({
            consumerProps: { onRender: tracker.handleRender },
        });

        const consumer = getByTestId('socket-consumer');
        await expect.element(consumer).toBeInTheDocument();

        const hasSocket = getByTestId('has-socket');
        const isConnected = getByTestId('is-connected');
        const isAuthenticated = getByTestId('is-authenticated');

        await expect.element(hasSocket).toHaveTextContent('true');
        await expect.element(isConnected).toHaveTextContent('false');
        await expect.element(isAuthenticated).toHaveTextContent('false');

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        const context = tracker.getContext();
        expect(context?.socket).toBe(mockSocket);
    });

    it('initializes isConnected from the current socket.connected value on mount', async () => {
        resetMockSocket({ connected: true });
        const { getByTestId } = await renderSocketProvider();

        const isConnected = getByTestId('is-connected');
        await expect.element(isConnected).toHaveTextContent('true');
    });

    it('subscribes to socket connect, disconnect and error events on mount', async () => {
        await renderSocketProvider();

        expect(mockSocket.on).toHaveBeenCalledWith('connect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('unsubscribes from socket events and disconnects the socket on unmount', async () => {
        const { unmount } = await renderSocketProvider();

        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        const disconnectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
        const errorHandler = mockSocket.on.mock.calls.find(([event]) => event === 'error')?.[1];

        expect(connectHandler).toBeDefined();
        expect(disconnectHandler).toBeDefined();
        expect(errorHandler).toBeDefined();

        unmount();

        expect(mockSocket.off).toHaveBeenCalledWith('connect', connectHandler);
        expect(mockSocket.off).toHaveBeenCalledWith('disconnect', disconnectHandler);
        expect(mockSocket.off).toHaveBeenCalledWith('error', errorHandler);
        expect(mockSocket.disconnect).toHaveBeenCalledOnce();
    });

    it('sets isConnected to true when the socket connect event fires', async () => {
        const { getByTestId } = await renderSocketProvider();

        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        expect(connectHandler).toBeDefined();

        connectHandler?.();

        const isConnected = getByTestId('is-connected');
        await expect.element(isConnected).toHaveTextContent('true');
    });

    it('sets isConnected to false and resets isAuthenticated when the socket disconnect event fires', async () => {
        const tracker = createContextTracker();
        const { getByTestId } = await renderSocketProvider({
            consumerProps: { onRender: tracker.handleRender },
        });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        tracker.getContext()?.authenticateSocket('token');

        const authenticatedHandler = mockSocket.once.mock.calls.find(([event]) => event === 'authenticated')?.[1];
        expect(authenticatedHandler).toBeDefined();
        authenticatedHandler?.({ playerId: 'player-123' });

        const disconnectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'disconnect')?.[1];
        expect(disconnectHandler).toBeDefined();
        disconnectHandler?.();

        const isConnected = getByTestId('is-connected');
        const isAuthenticated = getByTestId('is-authenticated');

        await expect.element(isConnected).toHaveTextContent('false');
        await expect.element(isAuthenticated).toHaveTextContent('false');
    });

    it('logs socket error messages to console when the socket error event fires', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        await renderSocketProvider();

        const errorHandler = mockSocket.on.mock.calls.find(([event]) => event === 'error')?.[1];
        expect(errorHandler).toBeDefined();
        errorHandler?.({ message: 'test-error' });

        expect(errorSpy).toHaveBeenCalledWith('Socket error:', 'test-error');
        errorSpy.mockRestore();
    });

    it('authenticateSocket sets socket.auth with the provided token and calls socket.connect', async () => {
        const tracker = createContextTracker();
        await renderSocketProvider({ consumerProps: { onRender: tracker.handleRender } });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        tracker.getContext()?.authenticateSocket('secure-token');

        expect(mockSocket.auth).toEqual({ token: 'secure-token' });
        expect(mockSocket.connect).toHaveBeenCalledOnce();
    });

    it('authenticateSocket handles the authenticated event by setting isAuthenticated to true', async () => {
        const tracker = createContextTracker();
        const { getByTestId } = await renderSocketProvider({
            consumerProps: { onRender: tracker.handleRender },
        });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        tracker.getContext()?.authenticateSocket('token');

        const authenticatedHandler = mockSocket.once.mock.calls.find(([event]) => event === 'authenticated')?.[1];
        expect(authenticatedHandler).toBeDefined();
        authenticatedHandler?.({ playerId: 'player-123' });

        const isAuthenticated = getByTestId('is-authenticated');
        await expect.element(isAuthenticated).toHaveTextContent('true');
    });

    it('authenticateSocket calls the optional onAuthenticated callback with the authenticated playerId', async () => {
        const tracker = createContextTracker();
        await renderSocketProvider({ consumerProps: { onRender: tracker.handleRender } });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        const onAuthenticated = vi.fn();
        tracker.getContext()?.authenticateSocket('token', onAuthenticated);

        const authenticatedHandler = mockSocket.once.mock.calls.find(([event]) => event === 'authenticated')?.[1];
        expect(authenticatedHandler).toBeDefined();
        authenticatedHandler?.({ playerId: 'player-123' });

        expect(onAuthenticated).toHaveBeenCalledWith({ playerId: 'player-123' });
    });

    it('authenticateSocket does not throw and still authenticates when onAuthenticated callback is not provided', async () => {
        const tracker = createContextTracker();
        const { getByTestId } = await renderSocketProvider({
            consumerProps: { onRender: tracker.handleRender },
        });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        expect(() => tracker.getContext()?.authenticateSocket('token')).not.toThrow();

        const authenticatedHandler = mockSocket.once.mock.calls.find(([event]) => event === 'authenticated')?.[1];
        expect(authenticatedHandler).toBeDefined();
        authenticatedHandler?.({ playerId: 'player-123' });

        const isAuthenticated = getByTestId('is-authenticated');
        await expect.element(isAuthenticated).toHaveTextContent('true');
    });

    it('exposes a stable context value when state has not changed between renders', async () => {
        const tracker = createContextTracker();
        const consumerProps = { onRender: tracker.handleRender };
        const { rerenderProvider } = await renderSocketProvider({ consumerProps });

        await vi.waitFor(() => {
            expect(tracker.getRenderCount()).toBeGreaterThan(0);
        });

        const initialContext = tracker.getContext();
        const initialRenderCount = tracker.getRenderCount();

        await rerenderProvider();

        expect(tracker.getRenderCount()).toBeGreaterThan(initialRenderCount);
        expect(tracker.getContext()).toBe(initialContext);
    });

    it('updates the context value when isConnected or isAuthenticated state changes', async () => {
        const tracker = createContextTracker();
        const { getByTestId } = await renderSocketProvider({
            consumerProps: { onRender: tracker.handleRender },
        });

        await vi.waitFor(() => {
            expect(tracker.getContext()).not.toBeNull();
        });

        const initialContext = tracker.getContext();

        const connectHandler = mockSocket.on.mock.calls.find(([event]) => event === 'connect')?.[1];
        expect(connectHandler).toBeDefined();
        connectHandler?.();

        await expect.element(getByTestId('is-connected')).toHaveTextContent('true');

        expect(tracker.getContext()).not.toBe(initialContext);
    });
});

describe('useSocket', () => {
    it('returns socket context values when used within SocketProvider', async () => {
        const { getByTestId } = await renderSocketProvider();

        const consumer = getByTestId('socket-consumer');
        await expect.element(consumer).toBeInTheDocument();
    });

    it('throws an invariant error when used outside of SocketProvider', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<SocketConsumer />);
        }).rejects.toThrow('useSocket must be used within a SocketProvider');

        consoleErrorSpy.mockRestore();
    });
});
