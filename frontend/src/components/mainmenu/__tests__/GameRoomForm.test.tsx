import type { PieceColor, RoomType, TimeControl } from '@grouchess/models';
import { createMockTimeControl } from '@grouchess/test-utils';
import type { Mock } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import * as useCreateGameRoomModule from '../../../hooks/useCreateGameRoom';
import GameRoomForm from '../GameRoomForm';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useCreateGameRoom', { spy: true });

// Mock form components to isolate GameRoomForm
vi.mock('../TimeControlForm', () => ({
    default: ({ onTimeControlSelect }: { onTimeControlSelect: (tc: TimeControl | null) => void }) => (
        <div data-testid="time-control-form">
            <h2>Time Control</h2>
            <button
                onClick={() => onTimeControlSelect(createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0 }))}
            >
                5 min
            </button>
            <button onClick={() => onTimeControlSelect(null)}>Unlimited</button>
        </div>
    ),
}));

vi.mock('../SideSelectForm', () => ({
    default: ({ onSideSelect }: { onSideSelect: (side: PieceColor | null) => void }) => (
        <div data-testid="side-select-form">
            <h2>Play as</h2>
            <button onClick={() => onSideSelect('white')}>White</button>
            <button onClick={() => onSideSelect('black')}>Black</button>
        </div>
    ),
}));

vi.mock('../DisplayNameForm', () => ({
    default: ({ onDisplayNameChange }: { onDisplayNameChange: (name: string) => void }) => (
        <div data-testid="display-name-form">
            <label htmlFor="display-name">Display Name (optional)</label>
            <input id="display-name" type="text" onChange={(e) => onDisplayNameChange(e.target.value)} />
        </div>
    ),
}));

afterEach(() => {
    vi.restoreAllMocks();
});

const defaultProps = {
    onSelfPlayStart: vi.fn(),
};

describe('GameRoomForm', () => {
    beforeEach(() => {
        vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
            createGameRoom: vi.fn(),
            loading: false,
            error: null,
        });
    });

    describe('Initial Render and Default State', () => {
        it('renders the component with all required elements', async () => {
            const { getByRole, getByTestId } = await render(<GameRoomForm {...defaultProps} />);

            await expect.element(getByRole('heading', { name: /start a game/i })).toBeInTheDocument();
            await expect.element(getByRole('button', { name: /play against a friend/i })).toBeInTheDocument();
            await expect.element(getByRole('button', { name: /self-play/i })).toBeInTheDocument();
            await expect.element(getByRole('button', { name: /^start$/i })).toBeInTheDocument();
            await expect.element(getByTestId('time-control-form')).toBeInTheDocument();
            await expect.element(getByTestId('side-select-form')).toBeInTheDocument();
            await expect.element(getByTestId('display-name-form')).toBeInTheDocument();
        });

        it("shows 'Play against a Friend' as default selected room type", async () => {
            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            const playAgainstFriendButton = getByRole('button', { name: /play against a friend/i });
            const selfPlayButton = getByRole('button', { name: /self-play/i });

            await expect.element(playAgainstFriendButton).toHaveAttribute('aria-pressed', 'true');
            await expect.element(selfPlayButton).toHaveAttribute('aria-pressed', 'false');
        });
    });

    describe('Room Type Selection', () => {
        it('switches to self-play mode when clicked', async () => {
            const { getByRole, getByTestId } = await render(<GameRoomForm {...defaultProps} />);

            const selfPlayButton = getByRole('button', { name: /self-play/i });
            await page.getByRole('button', { name: /self-play/i }).click();

            await expect.element(selfPlayButton).toHaveAttribute('aria-pressed', 'true');
            await expect.element(getByTestId('time-control-form')).toBeInTheDocument();
            await expect.element(getByTestId('side-select-form')).not.toBeInTheDocument();
            await expect.element(getByTestId('display-name-form')).not.toBeInTheDocument();
        });

        it('switches back to player-vs-player from self-play', async () => {
            const { getByRole, getByTestId } = await render(<GameRoomForm {...defaultProps} />);

            await page.getByRole('button', { name: /self-play/i }).click();
            await page.getByRole('button', { name: /play against a friend/i }).click();

            const playAgainstFriendButton = getByRole('button', { name: /play against a friend/i });
            await expect.element(playAgainstFriendButton).toHaveAttribute('aria-pressed', 'true');
            await expect.element(getByTestId('time-control-form')).toBeInTheDocument();
            await expect.element(getByTestId('side-select-form')).toBeInTheDocument();
            await expect.element(getByTestId('display-name-form')).toBeInTheDocument();
        });

        it.each([
            {
                roomType: 'player-vs-player' as RoomType,
                label: 'Play against a Friend',
                expectedForms: ['time-control-form', 'side-select-form', 'display-name-form'],
                expectedHiddenForms: [],
            },
            {
                roomType: 'self' as RoomType,
                label: 'Self-Play',
                expectedForms: ['time-control-form'],
                expectedHiddenForms: ['side-select-form', 'display-name-form'],
            },
        ])('shows correct forms for $roomType room type', async ({ label, expectedForms, expectedHiddenForms }) => {
            const { getByTestId } = await render(<GameRoomForm {...defaultProps} />);

            await page.getByRole('button', { name: new RegExp(label, 'i') }).click();

            for (const formId of expectedForms) {
                await expect.element(getByTestId(formId)).toBeInTheDocument();
            }

            for (const formId of expectedHiddenForms) {
                await expect.element(getByTestId(formId)).not.toBeInTheDocument();
            }
        });
    });

    describe('Player-vs-Player - Form Interactions and Successful Room Creation', () => {
        const roomId = 'test-room-123';
        const playerId = 'test-player-456';
        const token = 'test-token-789';
        let mockCreateGameRoom: Mock<useCreateGameRoomModule.CreateGameRoomFn>;

        function assertSuccessfulNavigation() {
            expect(mockNavigate).toHaveBeenCalledWith(`/${roomId}`, {
                state: {
                    roomId,
                    playerId,
                    token,
                    isCreator: true,
                },
            });
        }

        beforeEach(() => {
            mockCreateGameRoom = vi.fn().mockImplementation(({ onSuccess }) => {
                onSuccess({
                    roomId,
                    playerId,
                    token,
                });
            });
            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: mockCreateGameRoom,
                loading: false,
                error: null,
            });
        });

        it('updates selected time control option', async () => {
            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            const fiveMinButton = getByRole('button', { name: /5 min/i });
            await fiveMinButton.click();

            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            expect(mockCreateGameRoom).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeControlAlias: '5|0',
                })
            );
            assertSuccessfulNavigation();
        });

        it('updates selected side in SideSelectForm', async () => {
            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            const blackButton = getByRole('button', { name: /black/i });
            await blackButton.click();

            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            expect(mockCreateGameRoom).toHaveBeenCalledWith(
                expect.objectContaining({
                    color: 'black',
                })
            );
            assertSuccessfulNavigation();
        });

        it('updates display name in DisplayNameForm', async () => {
            const { getByRole, getByLabelText } = await render(<GameRoomForm {...defaultProps} />);

            const displayNameInput = getByLabelText(/display name/i);
            await displayNameInput.fill('TestUser');

            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            expect(mockCreateGameRoom).toHaveBeenCalledWith(
                expect.objectContaining({
                    displayName: 'TestUser',
                })
            );
            assertSuccessfulNavigation();
        });

        it('updates all form fields together', async () => {
            const { getByRole, getByLabelText } = await render(<GameRoomForm {...defaultProps} />);

            const fiveMinButton = getByRole('button', { name: /5 min/i });
            await fiveMinButton.click();

            const blackButton = getByRole('button', { name: /black/i });
            await blackButton.click();

            const displayNameInput = getByLabelText(/display name/i);
            await displayNameInput.fill('TestUser');

            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            expect(mockCreateGameRoom).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeControlAlias: '5|0',
                    color: 'black',
                    displayName: 'TestUser',
                    roomType: 'player-vs-player',
                })
            );
            assertSuccessfulNavigation();
        });
    });

    describe('Self-Play Mode', () => {
        let mockOnSelfPlayStart: Mock;
        let mockCreateGameRoom: Mock<useCreateGameRoomModule.CreateGameRoomFn>;

        beforeEach(() => {
            mockOnSelfPlayStart = vi.fn();
            mockCreateGameRoom = vi.fn();
            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: mockCreateGameRoom,
                loading: false,
                error: null,
            });
        });

        it('calls onSelfPlayStart when Start is clicked in self-play mode', async () => {
            const { getByRole } = await render(<GameRoomForm onSelfPlayStart={mockOnSelfPlayStart} />);

            await page.getByRole('button', { name: /self-play/i }).click();

            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            expect(mockOnSelfPlayStart).toHaveBeenCalledWith(null);
            expect(mockCreateGameRoom).not.toHaveBeenCalled();
        });

        it.each([
            {
                scenario: 'with time control selected',
                selectTimeControl: true,
                expectedTimeControl: createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0 }),
            },
            {
                scenario: 'with unlimited time control',
                selectTimeControl: false,
                expectedTimeControl: null,
            },
        ])(
            'calls onSelfPlayStart with correct time control: $scenario',
            async ({ selectTimeControl, expectedTimeControl }) => {
                const { getByRole } = await render(<GameRoomForm onSelfPlayStart={mockOnSelfPlayStart} />);

                await page.getByRole('button', { name: /self-play/i }).click();

                if (selectTimeControl) {
                    const fiveMinButton = getByRole('button', { name: /5 min/i });
                    await fiveMinButton.click();
                }

                const startButton = getByRole('button', { name: /^start$/i });
                await startButton.click();

                expect(mockOnSelfPlayStart).toHaveBeenCalledWith(expectedTimeControl);
                expect(mockCreateGameRoom).not.toHaveBeenCalled();
            }
        );
    });

    describe('Error Handling', () => {
        it.each([
            {
                scenario: 'API error',
                errorMessage: 'Failed to create room.',
            },
            {
                scenario: 'validation error',
                errorMessage: 'Invalid display name.',
            },
            {
                scenario: 'network timeout',
                errorMessage: 'Request timed out.',
            },
        ])('displays error message when room creation fails: $scenario', async ({ errorMessage }) => {
            const mockCreateGameRoom = vi.fn().mockImplementation(({ onError }) => {
                onError({ message: errorMessage });
            });
            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: mockCreateGameRoom as unknown as useCreateGameRoomModule.CreateGameRoomFn,
                loading: false,
                error: null,
            });

            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            // Click Start to trigger room creation
            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            // Verify error message is displayed with correct text
            const errorElement = getByRole('alert');
            await expect.element(errorElement).toBeInTheDocument();
            await expect.element(errorElement).toHaveTextContent(errorMessage);
        });

        it('clears previous error when retrying', async () => {
            const errorMessage = 'Failed to create room.';
            const roomId = 'test-room-123';
            const playerId = 'test-player-456';
            const token = 'test-token-789';

            let callCount = 0;
            const mockCreateGameRoom = vi.fn().mockImplementation(({ onSuccess, onError }) => {
                callCount++;
                if (callCount === 1) {
                    // First attempt fails
                    onError({ message: errorMessage });
                } else {
                    // Second attempt succeeds
                    onSuccess({ roomId, playerId, token });
                }
            });

            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: mockCreateGameRoom as unknown as useCreateGameRoomModule.CreateGameRoomFn,
                loading: false,
                error: null,
            });

            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            // First attempt - should fail
            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();
            const errorElement = getByRole('alert');
            await expect.element(errorElement).toBeInTheDocument();
            await expect.element(errorElement).toHaveTextContent(errorMessage);

            // Second attempt - should succeed and clear error
            await startButton.click();
            await expect.element(errorElement).not.toBeInTheDocument();
            expect(mockNavigate).toHaveBeenCalledWith(`/${roomId}`, {
                state: {
                    roomId,
                    playerId,
                    token,
                    isCreator: true,
                },
            });
        });
    });

    describe('Loading State while creating room', () => {
        beforeEach(() => {
            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: vi.fn(),
                loading: true,
                error: null,
            });
        });

        it('shows loading spinner during room creation', async () => {
            const { getByRole, getByText } = await render(<GameRoomForm {...defaultProps} />);

            // Verify spinner status element is visible
            const statusElement = getByRole('status');
            await expect.element(statusElement).toBeInTheDocument();

            // Verify loading text is displayed
            const loadingText = getByText(/creating game room\.\.\./i);
            await expect.element(loadingText).toBeInTheDocument();
        });

        it('disables Start button while loading', async () => {
            const { getByRole } = await render(<GameRoomForm {...defaultProps} />);

            // Button should be accessible by its aria-label and disabled
            const startButton = getByRole('button', { name: /creating game room/i });
            await expect.element(startButton).toBeDisabled();
        });

        it('shows correct loading state text', async () => {
            const { getByRole, getByText } = await render(<GameRoomForm {...defaultProps} />);

            // Verify button has correct accessible name
            const startButton = getByRole('button', { name: /creating game room/i });
            await expect.element(startButton).toBeInTheDocument();

            // Verify loading text is displayed
            const loadingText = getByText(/creating game room\.\.\./i);
            await expect.element(loadingText).toBeInTheDocument();

            // Verify status role is present
            const statusElement = getByRole('status');
            await expect.element(statusElement).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('preserves form data when switching room types and back', async () => {
            const mockCreateGameRoom = vi.fn().mockImplementation(({ onSuccess }) => {
                onSuccess({
                    roomId: 'test-room-123',
                    playerId: 'test-player-456',
                    token: 'test-token-789',
                });
            });
            vi.spyOn(useCreateGameRoomModule, 'useCreateGameRoom').mockReturnValue({
                createGameRoom: mockCreateGameRoom,
                loading: false,
                error: null,
            });

            const { getByRole, getByLabelText } = await render(<GameRoomForm {...defaultProps} />);

            // Fill forms in player-vs-player mode
            const fiveMinButton = getByRole('button', { name: /5 min/i });
            await fiveMinButton.click();

            const blackButton = getByRole('button', { name: /black/i });
            await blackButton.click();

            const displayNameInput = getByLabelText(/display name/i);
            await displayNameInput.fill('TestUser');

            // Switch to self-play
            await page.getByRole('button', { name: /self-play/i }).click();

            // Switch back to player-vs-player
            await page.getByRole('button', { name: /play against a friend/i }).click();

            // Click Start to verify form data was preserved
            const startButton = getByRole('button', { name: /^start$/i });
            await startButton.click();

            // Verify all form data was preserved
            expect(mockCreateGameRoom).toHaveBeenCalledWith(
                expect.objectContaining({
                    timeControlAlias: '5|0',
                    color: 'black',
                    displayName: 'TestUser',
                    roomType: 'player-vs-player',
                })
            );
        });
    });
});
