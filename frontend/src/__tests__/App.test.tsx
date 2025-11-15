import type { ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import App from '../App';

// Mock all providers to render their children with testids
vi.mock(import('../providers/AuthProvider'), () => ({
    default: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="auth-provider">{children}</div>),
}));

vi.mock(import('../providers/SocketProvider'), () => ({
    default: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="socket-provider">{children}</div>),
}));

vi.mock(import('../providers/ImagesProvider'), () => ({
    default: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="images-provider">{children}</div>),
}));

vi.mock(import('../providers/SoundProvider'), () => ({
    default: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="sound-provider">{children}</div>),
}));

vi.mock(import('../providers/ClockTickProvider'), () => ({
    default: vi.fn(({ children }: { children: ReactNode }) => <div data-testid="clock-tick-provider">{children}</div>),
}));

vi.mock(import('../components/views/ViewController'), () => ({
    default: vi.fn(() => <div data-testid="view-controller">ViewController</div>),
}));

describe('App', () => {
    it('renders all providers and ViewController', async () => {
        const { getByTestId } = await render(<App />);

        await expect.element(getByTestId('auth-provider')).toBeInTheDocument();
        await expect.element(getByTestId('socket-provider')).toBeInTheDocument();
        await expect.element(getByTestId('images-provider')).toBeInTheDocument();
        await expect.element(getByTestId('sound-provider')).toBeInTheDocument();
        await expect.element(getByTestId('clock-tick-provider')).toBeInTheDocument();
        await expect.element(getByTestId('view-controller')).toBeInTheDocument();
    });
});
