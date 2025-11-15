import { type ReactNode } from 'react';

import { type GetGameRoomBasicInfoResponse } from '@grouchess/http-schemas';
import type { TimeControl } from '@grouchess/models';
import { createMockTimeControl } from '@grouchess/test-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { render } from 'vitest-browser-react';

import * as useJoinGameRoomModule from '../../../hooks/useJoinGameRoom';
import { _resetPromiseCacheForTesting, fetchWithSchemasOrThrow } from '../../../utils/fetch';
import ChallengerWaitingRoom from '../ChallengerWaitingRoom';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useJoinGameRoom', { spy: true });

vi.mock('../../../utils/fetch', async () => {
    const actual = await vi.importActual('../../../utils/fetch');
    return {
        ...actual,
        fetchWithSchemasOrThrow: vi.fn(),
    };
});

const fetchWithSchemasOrThrowMock = vi.mocked(fetchWithSchemasOrThrow);

const mockGetGameRoomBasicInfoResponse: GetGameRoomBasicInfoResponse = {
    roomId: 'test-room-123',
    timeControl: createMockTimeControl(),
};

afterEach(() => {
    vi.restoreAllMocks();
    _resetPromiseCacheForTesting();
});

const defaultProps = {
    roomId: 'test-room-123',
    onJoinGameRoom: vi.fn(),
};

function renderWithErrorBoundary(component: ReactNode) {
    return render(<ErrorBoundary fallbackRender={({ error }) => <p>{error.message}</p>}>{component}</ErrorBoundary>);
}

describe('ChallengerWaitingRoom', () => {
    describe('Render', () => {
        it('renders', async () => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);
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
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockData);

            const { getByText } = await render(<ChallengerWaitingRoom {...defaultProps} roomId={roomId} />);

            await expect.element(getByText(roomId)).toBeInTheDocument();
            await expect.element(getByText(expectedDisplayText, { exact: true })).toBeInTheDocument();
        });
    });

    describe('Room Info Fetching', () => {
        it('fetches room info on mount', async () => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);
            await render(<ChallengerWaitingRoom {...defaultProps} />);
            expect(fetchWithSchemasOrThrowMock).toHaveBeenCalledWith(
                expect.stringContaining('/room/test-room-123'),
                expect.objectContaining({
                    errorMessage: 'Failed to fetch room info.',
                })
            );
        });

        it('throws error if fetch fails', async () => {
            vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error boundary logging
            fetchWithSchemasOrThrowMock.mockRejectedValue(new Error('Failed to fetch room info.'));
            const { getByText } = await renderWithErrorBoundary(<ChallengerWaitingRoom {...defaultProps} />);
            await expect.element(getByText('Failed to fetch room info.')).toBeInTheDocument();
        });
    });

    describe('Display Name Form', () => {
        it('updates display name state on input change', async () => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);
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
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);
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
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);

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
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);

            const { getByRole } = await render(<ChallengerWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Joining...' });
            await expect.element(button).toBeDisabled();
        });
    });

    describe('Back Button', () => {
        it('navigates back on button click', async () => {
            fetchWithSchemasOrThrowMock.mockResolvedValue(mockGetGameRoomBasicInfoResponse);
            const { getByRole } = await render(<ChallengerWaitingRoom {...defaultProps} />);
            const button = getByRole('button', { name: 'Back' });
            await button.click();
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
