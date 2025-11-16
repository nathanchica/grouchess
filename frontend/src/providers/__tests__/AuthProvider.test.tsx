import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import AuthProvider, { useAuth } from '../AuthProvider';

// Helper component to consume the context for testing
const AuthConsumer = () => {
    const auth = useAuth();
    return (
        <div data-testid="auth-consumer">
            <span data-testid="room-id">{auth.roomId}</span>
            <span data-testid="player-id">{auth.playerId}</span>
            <span data-testid="token">{auth.token}</span>
            <button
                data-testid="load-data-button"
                onClick={() => auth.loadData({ roomId: '123', playerId: 'p1', token: 't1' })}
            >
                Load Data
            </button>
            <button data-testid="clear-auth-button" onClick={() => auth.clearAuth()}>
                Clear Auth
            </button>
        </div>
    );
};

type RenderAuthProviderOptions = {
    children?: ReactNode;
};

function renderAuthProvider({ children = <AuthConsumer /> }: RenderAuthProviderOptions = {}) {
    return render(<AuthProvider>{children}</AuthProvider>);
}

describe('AuthProvider', () => {
    it('provides initial null auth data', async () => {
        const { getByTestId } = await renderAuthProvider();

        const roomId = getByTestId('room-id');
        const playerId = getByTestId('player-id');
        const token = getByTestId('token');

        expect(roomId).toHaveTextContent('');
        expect(playerId).toHaveTextContent('');
        expect(token).toHaveTextContent('');
    });

    it('loads auth data correctly', async () => {
        const { getByTestId } = await renderAuthProvider();

        const loadDataButton = getByTestId('load-data-button');
        await loadDataButton.click();

        const roomId = getByTestId('room-id');
        const playerId = getByTestId('player-id');
        const token = getByTestId('token');

        expect(roomId).toHaveTextContent('123');
        expect(playerId).toHaveTextContent('p1');
        expect(token).toHaveTextContent('t1');
    });

    it('clears auth data correctly', async () => {
        const { getByTestId } = await renderAuthProvider();

        const loadDataButton = getByTestId('load-data-button');
        await loadDataButton.click();

        const clearAuthButton = getByTestId('clear-auth-button');
        await clearAuthButton.click();

        const roomId = getByTestId('room-id');
        const playerId = getByTestId('player-id');
        const token = getByTestId('token');

        expect(roomId).toHaveTextContent('');
        expect(playerId).toHaveTextContent('');
        expect(token).toHaveTextContent('');
    });
});

describe('useAuth', () => {
    it('returns auth context values when used within AuthProvider', async () => {
        const { getByTestId } = await renderAuthProvider();
        const consumer = getByTestId('auth-consumer');
        expect(consumer).toBeInTheDocument();
    });

    it('throws error when used outside of AuthProvider', async () => {
        // Mock console.error to prevent it from polluting the test output
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<AuthConsumer />);
        }).rejects.toThrow('useAuth must be used within AuthProvider');
    });
});
