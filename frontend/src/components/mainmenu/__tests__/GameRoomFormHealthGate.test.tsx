import type { TimeControl } from '@grouchess/models';
import { render } from 'vitest-browser-react';

import { _resetPromiseCacheForTesting } from '../../../utils/fetch';
import GameRoomFormHealthGate from '../GameRoomFormHealthGate';

// Mock the child components to isolate GameRoomFormHealthGate
vi.mock('../GameRoomForm', () => ({
    default: ({ onSelfPlayStart }: { onSelfPlayStart: (timeControl: TimeControl | null) => void }) => (
        <div data-testid="game-room-form">
            Mocked GameRoomForm
            <button onClick={() => onSelfPlayStart(null)}>Start Self Play</button>
        </div>
    ),
}));

vi.mock('../ServiceHealthCheckView', () => ({
    default: ({ onHealthy }: { onHealthy: () => void }) => (
        <div data-testid="service-health-check-view">
            Mocked ServiceHealthCheckView
            <button onClick={onHealthy}>Mark as Healthy</button>
        </div>
    ),
}));

type CreateFetchResponseArgs = {
    ok?: boolean;
};

function createFetchResponse({ ok = true }: CreateFetchResponseArgs = {}): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue({}),
    } as unknown as Response;
}

afterEach(() => {
    vi.restoreAllMocks();
    _resetPromiseCacheForTesting();
});

const defaultProps = {
    onSelfPlayStart: vi.fn(),
};

const defaultFetchResponse: Response = createFetchResponse();

describe('GameRoomFormHealthGate', () => {
    describe('when backend service is initially healthy', () => {
        it('renders GameRoomForm component', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const { getByTestId } = await render(<GameRoomFormHealthGate {...defaultProps} />);
            await expect.element(getByTestId('game-room-form')).toBeInTheDocument();
        });

        it('passes onSelfPlayStart prop correctly to GameRoomForm', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const mockOnSelfPlayStart = vi.fn();
            const { getByRole } = await render(<GameRoomFormHealthGate onSelfPlayStart={mockOnSelfPlayStart} />);

            const button = getByRole('button', { name: 'Start Self Play' });
            await button.click();

            expect(mockOnSelfPlayStart).toHaveBeenCalledWith(null);
        });
    });

    describe('when backend service is initially unhealthy', () => {
        it('renders ServiceHealthCheckView component', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const { getByTestId } = await render(<GameRoomFormHealthGate {...defaultProps} />);
            await expect.element(getByTestId('service-health-check-view')).toBeInTheDocument();
        });

        it('does not render GameRoomForm component', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const { getByTestId } = await render(<GameRoomFormHealthGate {...defaultProps} />);
            await expect.element(getByTestId('game-room-form')).not.toBeInTheDocument();
        });
    });

    describe('when service transitions from unhealthy to healthy', () => {
        it('initially renders ServiceHealthCheckView when unhealthy', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const { getByTestId } = await render(<GameRoomFormHealthGate {...defaultProps} />);
            await expect.element(getByTestId('service-health-check-view')).toBeInTheDocument();
        });

        it('renders GameRoomForm after onHealthy callback is triggered', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const { getByTestId, getByRole } = await render(<GameRoomFormHealthGate {...defaultProps} />);

            await expect.element(getByTestId('service-health-check-view')).toBeInTheDocument();

            const button = getByRole('button', { name: 'Mark as Healthy' });
            await button.click();

            await expect.element(getByTestId('game-room-form')).toBeInTheDocument();
            await expect.element(getByTestId('service-health-check-view')).not.toBeInTheDocument();
        });

        it('passes onSelfPlayStart prop to GameRoomForm after becoming healthy', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const mockOnSelfPlayStart = vi.fn();
            const { getByRole } = await render(<GameRoomFormHealthGate onSelfPlayStart={mockOnSelfPlayStart} />);

            const healthButton = getByRole('button', { name: 'Mark as Healthy' });
            await healthButton.click();

            const playButton = getByRole('button', { name: 'Start Self Play' });
            await playButton.click();

            expect(mockOnSelfPlayStart).toHaveBeenCalledWith(null);
        });
    });

    describe('health check behavior', () => {
        it('handles fetch errors by rendering ServiceHealthCheckView', async () => {
            vi.spyOn(window, 'fetch').mockRejectedValueOnce(new Error('Network error'));
            const { getByTestId } = await render(<GameRoomFormHealthGate {...defaultProps} />);
            await expect.element(getByTestId('service-health-check-view')).toBeInTheDocument();
        });

        it('uses getCachedPromise with correct key for health check', async () => {
            const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue(defaultFetchResponse);

            await render(<GameRoomFormHealthGate {...defaultProps} />);
            await render(<GameRoomFormHealthGate {...defaultProps} />);

            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });
});
