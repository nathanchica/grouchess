import { type ReactNode } from 'react';

import { type GetGameRoomBasicInfoResponse } from '@grouchess/http-schemas';
import type { TimeControl } from '@grouchess/models';
import { createMockTimeControl } from '@grouchess/test-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { render } from 'vitest-browser-react';

import * as useJoinGameRoomModule from '../../../hooks/useJoinGameRoom';
import { _resetPromiseCacheForTesting } from '../../../utils/fetch';
import ChallengerWaitingRoom from '../ChallengerWaitingRoom';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useJoinGameRoom', { spy: true });

const mockGetGameRoomBasicInfoParsedResponse: GetGameRoomBasicInfoResponse = {
    roomId: 'test-room-123',
    timeControl: createMockTimeControl(),
};

type CreateFetchResponseArgs = {
    data?: GetGameRoomBasicInfoResponse | null;
    ok?: boolean;
};

function createFetchResponse({
    data = mockGetGameRoomBasicInfoParsedResponse,
    ok = true,
}: CreateFetchResponseArgs = {}): Response {
    return {
        ok,
        json: vi.fn().mockResolvedValue(data),
    } as unknown as Response;
}

afterEach(() => {
    vi.restoreAllMocks();
    _resetPromiseCacheForTesting();
});

const defaultProps = {
    roomId: 'test-room-123',
    onJoinGameRoom: vi.fn(),
};

const defaultFetchResponse: Response = createFetchResponse();

function renderWithErrorBoundary(component: ReactNode) {
    return render(<ErrorBoundary fallbackRender={({ error }) => <p>{error.message}</p>}>{component}</ErrorBoundary>);
}

describe('ChallengerWaitingRoom', () => {
    describe('Render', () => {
        it('renders', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const { getByRole, getByPlaceholder } = await render(<ChallengerWaitingRoom {...defaultProps} />);
            await expect.element(getByRole('heading', { name: 'Join Game' })).toBeInTheDocument();
            await expect.element(getByPlaceholder('Enter your display name')).toBeInTheDocument();
            await expect.element(getByRole('button', { name: 'Join Game' })).toBeInTheDocument();
            await expect.element(getByRole('button', { name: 'Back' })).toBeInTheDocument();
        });

        it.each([
            {
                description: '5 min time control',
                roomId: '5-min-room',
                timeControl: createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0, displayText: '5 min' }),
                expectedDisplayText: '5 min',
            },
            {
                description: '3 min + 2 sec increment time control',
                roomId: '3-min-2-sec-room',
                timeControl: createMockTimeControl({ alias: '3|2', minutes: 3, increment: 2, displayText: '3|2' }),
                expectedDisplayText: '3|2',
            },
            {
                description: 'unlimited time control',
                roomId: 'unlimited-room',
                timeControl: null,
                expectedDisplayText: 'Unlimited',
            },
        ])('renders fetched room info: $description', async ({ roomId, timeControl, expectedDisplayText }) => {
            const mockData: GetGameRoomBasicInfoResponse = {
                roomId,
                timeControl: timeControl as TimeControl | null,
            };
            const fetchResponse = createFetchResponse({ data: mockData });
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(fetchResponse);

            const { getByText } = await render(<ChallengerWaitingRoom {...defaultProps} roomId={roomId} />);

            await expect.element(getByText(roomId)).toBeInTheDocument();
            await expect.element(getByText(expectedDisplayText, { exact: true })).toBeInTheDocument();
        });
    });

    describe('Room Info Fetching', () => {
        it('fetches room info on mount', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            await render(<ChallengerWaitingRoom {...defaultProps} />);
            expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/room/test-room-123'));
        });

        it('throws error if fetch fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(createFetchResponse({ ok: false }));
            const { getByText } = await renderWithErrorBoundary(<ChallengerWaitingRoom {...defaultProps} />);
            await expect.element(getByText('Failed to fetch room info.')).toBeInTheDocument();
            vi.restoreAllMocks();
        });

        it('throws error if response parsing fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            const invalidFetchResponse = createFetchResponse({ data: null });
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(invalidFetchResponse);
            const { getByText } = await renderWithErrorBoundary(<ChallengerWaitingRoom {...defaultProps} />);
            await expect.element(getByText('Failed to parse room info.')).toBeInTheDocument();
            vi.restoreAllMocks();
        });

        it('throws error if API base URL is not configured', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            vi.stubEnv('VITE_API_BASE_URL', undefined);
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const { getByText } = await renderWithErrorBoundary(<ChallengerWaitingRoom {...defaultProps} />);
            await expect.element(getByText('Room endpoint is not configured.')).toBeInTheDocument();
            vi.restoreAllMocks();
        });
    });

    describe('Display Name Form', () => {
        it('updates display name state on input change', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const { getByPlaceholder } = await render(<ChallengerWaitingRoom {...defaultProps} />);
            const input = getByPlaceholder('Enter your display name');
            await expect.element(input).toHaveValue('');
            await input.fill('TestUser');
            await expect.element(input).toHaveValue('TestUser');
        });
    });

    describe('Join Game Room Button', () => {
        it('joins the game room on button click', async () => {
            const roomId = 'test-join-room-success';
            const playerId = 'player-123';
            const token = 'token-abc';
            vi.spyOn(useJoinGameRoomModule, 'useJoinGameRoom').mockReturnValue({
                joinGameRoom: vi.fn().mockImplementation(({ onSuccess }) => {
                    onSuccess({
                        roomId,
                        playerId,
                        token,
                    });
                }),
                loading: false,
                error: null,
            });
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const mockOnJoinGameRoom = vi.fn();

            const { getByRole } = await render(
                <ChallengerWaitingRoom roomId={roomId} onJoinGameRoom={mockOnJoinGameRoom} />
            );

            const button = getByRole('button', { name: 'Join Game' });
            await button.click();

            expect(mockOnJoinGameRoom).toHaveBeenCalledWith({
                roomId,
                playerId,
                token,
            });
        });

        it('shows error message if joining fails', async () => {
            const errorMessage = 'Failed to join room.';
            vi.spyOn(useJoinGameRoomModule, 'useJoinGameRoom').mockReturnValue({
                joinGameRoom: vi.fn().mockImplementation(({ onError }) => {
                    onError({ message: errorMessage });
                }),
                loading: false,
                error: null,
            });
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);

            const { getByRole } = await render(<ChallengerWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Join Game' });
            await button.click();

            await expect.element(getByRole('alert')).toHaveTextContent(errorMessage);
        });

        it('disables join button while joining', async () => {
            vi.spyOn(useJoinGameRoomModule, 'useJoinGameRoom').mockReturnValue({
                joinGameRoom: vi.fn(),
                loading: true,
                error: null,
            });
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);

            const { getByRole } = await render(<ChallengerWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Joining...' });
            await expect.element(button).toBeDisabled();
        });
    });

    describe('Back Button', () => {
        it('navigates back on button click', async () => {
            vi.spyOn(window, 'fetch').mockResolvedValueOnce(defaultFetchResponse);
            const { getByRole } = await render(<ChallengerWaitingRoom {...defaultProps} />);
            const button = getByRole('button', { name: 'Back' });
            await button.click();
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
