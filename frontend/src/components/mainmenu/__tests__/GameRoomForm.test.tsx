import { type ReactNode } from 'react';

import type { PieceColor, RoomType, TimeControl } from '@grouchess/models';
import { createMockTimeControl } from '@grouchess/test-utils';
import { ErrorBoundary } from 'react-error-boundary';
import { render } from 'vitest-browser-react';

import * as useCreateGameRoomModule from '../../../hooks/useCreateGameRoom';
import GameRoomForm from '../GameRoomForm';

const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../../hooks/useCreateGameRoom', { spy: true });

afterEach(() => {
    vi.restoreAllMocks();
});

const defaultProps = {
    onSelfPlayStart: vi.fn(),
};

function renderWithErrorBoundary(component: ReactNode) {
    return render(<ErrorBoundary fallbackRender={({ error }) => <p>{error.message}</p>}>{component}</ErrorBoundary>);
}

describe('GameRoomForm', () => {
    describe('Initial Render and Default State', () => {
        it('renders the component with all required elements', async () => {
            // TODO: Implement test
            // Setup: Default props with onSelfPlayStart callback
            // Action: Render component
            // Expected: Should display heading "Start a game", room type buttons, Start button, and default forms section
        });

        it("shows 'Play against a Friend' as default selected room type", async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Render component
            // Expected: Player-vs-player option should have selected styling (ring-2 ring-emerald-500)
        });

        it('displays correct forms for default room type', async () => {
            // TODO: Implement test
            // Setup: Default props (player-vs-player is default)
            // Action: Render component
            // Expected: Should render TimeControlForm, SideSelectForm, and DisplayNameForm
        });
    });

    describe('Room Type Selection', () => {
        it('switches to self-play mode when clicked', async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Click on "Self-Play" button
            // Expected: Self-play button gets selected styling, only TimeControlForm is visible
        });

        it('switches back to player-vs-player from self-play', async () => {
            // TODO: Implement test
            // Setup: Default props, initially select self-play
            // Action: Click on "Play against a Friend" button
            // Expected: All three forms become visible again
        });

        it.each([
            {
                roomType: 'player-vs-player' as RoomType,
                label: 'Play against a Friend',
                description: 'should display TimeControlForm, SideSelectForm, and DisplayNameForm',
                expectedFormCount: 3,
            },
            {
                roomType: 'self' as RoomType,
                label: 'Self-Play',
                description: 'should display only TimeControlForm',
                expectedFormCount: 1,
            },
        ])('shows correct forms for $roomType room type', async ({ roomType, label, description, expectedFormCount }) => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Click on room type button with given label
            // Expected: Verify correct number of forms are displayed based on expectedFormCount
        });
    });

    describe('Form Interactions', () => {
        it('updates selected time control option', async () => {
            // TODO: Implement test
            // Setup: Default props, mock TimeControlForm with options
            // Action: Select a time control option (e.g., "5 min")
            // Expected: State updates with selected time control
        });

        it('updates selected side in SideSelectForm', async () => {
            // TODO: Implement test
            // Setup: Default props (player-vs-player mode)
            // Action: Click on "Black" or "Random Side" radio button
            // Expected: Selected side updates accordingly
        });

        it('updates display name in DisplayNameForm', async () => {
            // TODO: Implement test
            // Setup: Default props (player-vs-player mode)
            // Action: Type "TestUser" in display name input
            // Expected: Display name state updates
        });
    });

    describe('Self-Play Mode', () => {
        it('calls onSelfPlayStart when Start is clicked in self-play mode', async () => {
            // TODO: Implement test
            // Setup: Props with mock onSelfPlayStart, select self-play mode
            // Action: Click Start button
            // Expected: onSelfPlayStart called with selected time control (or null)
            // Note: Should not call createGameRoom
        });

        it('passes null time control when unlimited is selected', async () => {
            // TODO: Implement test
            // Setup: Self-play mode, unlimited time selected
            // Action: Click Start button
            // Expected: onSelfPlayStart called with null
        });

        it.each([
            {
                scenario: 'with time control selected',
                timeControl: createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0 }),
                expectedTimeControl: createMockTimeControl({ alias: '5|0', minutes: 5, increment: 0 }),
            },
            {
                scenario: 'with unlimited time control',
                timeControl: null,
                expectedTimeControl: null,
            },
        ])(
            'calls onSelfPlayStart with correct time control: $scenario',
            async ({ scenario, timeControl, expectedTimeControl }) => {
                // TODO: Implement test
                // Setup: Self-play mode, set timeControl
                // Action: Click Start button
                // Expected: onSelfPlayStart called with expectedTimeControl
            }
        );
    });

    describe('Player-vs-Player Room Creation (Success Path)', () => {
        it('creates room with all form data', async () => {
            // TODO: Implement test
            // Setup: Mock successful createGameRoom, fill all forms
            // Action: Click Start button
            // Expected: createGameRoom called with correct params, navigates to room
        });

        it('creates room with minimal data (no display name)', async () => {
            // TODO: Implement test
            // Setup: Mock successful createGameRoom, leave display name empty
            // Action: Click Start button
            // Expected: createGameRoom called with null displayName
        });

        it('navigates to created room on success', async () => {
            // TODO: Implement test
            // Setup: Mock createGameRoom returns roomId, playerId, token
            // Action: Click Start after filling forms
            // Expected: navigate called with `/${roomId}` and state containing room data with isCreator: true
        });

        it.each([
            {
                scenario: 'with all form fields filled',
                displayName: 'TestUser',
                side: 'white' as PieceColor,
                timeControl: createMockTimeControl({ alias: '5|0' }),
            },
            {
                scenario: 'without display name',
                displayName: null,
                side: 'black' as PieceColor,
                timeControl: createMockTimeControl({ alias: '10|5' }),
            },
            {
                scenario: 'with random side selection',
                displayName: 'Player',
                side: null,
                timeControl: null,
            },
        ])('creates room correctly: $scenario', async ({ scenario, displayName, side, timeControl }) => {
            // TODO: Implement test
            // Setup: Mock successful createGameRoom, set form values
            // Action: Click Start button
            // Expected: createGameRoom called with correct parameters
        });
    });

    describe('Error Handling', () => {
        it('displays error message when room creation fails', async () => {
            // TODO: Implement test
            // Setup: Mock createGameRoom to call onError with message
            // Action: Click Start button
            // Expected: Error message displayed in UI (red text above Start button)
        });

        it('clears previous error when retrying', async () => {
            // TODO: Implement test
            // Setup: First attempt fails, then succeeds
            // Action: Click Start twice
            // Expected: Error cleared on second attempt
        });

        it('handles network errors gracefully', async () => {
            // TODO: Implement test
            // Setup: Mock createGameRoom to throw network error
            // Action: Click Start button
            // Expected: Generic error message displayed
        });

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
        ])('displays error message correctly: $scenario', async ({ scenario, errorMessage }) => {
            // TODO: Implement test
            // Setup: Mock createGameRoom to call onError with errorMessage
            // Action: Click Start button
            // Expected: Error message displayed with correct text
        });
    });

    describe('Loading States', () => {
        it('shows loading spinner during room creation', async () => {
            // TODO: Implement test
            // Setup: Mock useCreateGameRoom with loading: true
            // Action: Render component
            // Expected: Spinner visible, button shows "Creating game room..."
        });

        it('disables Start button while loading', async () => {
            // TODO: Implement test
            // Setup: Mock useCreateGameRoom with loading: true
            // Action: Try to click Start button
            // Expected: Button is disabled
        });

        it('shows correct loading state text', async () => {
            // TODO: Implement test
            // Setup: Mock useCreateGameRoom with loading: true
            // Action: Render component
            // Expected: Button text changes to "Creating game room..." and includes status role
        });
    });

    describe('Edge Cases', () => {
        it('handles rapid room type switching', async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Quickly click between room types multiple times
            // Expected: UI stays consistent, correct forms shown
        });

        it('preserves form data when switching room types and back', async () => {
            // TODO: Implement test
            // Setup: Fill forms in player-vs-player mode
            // Action: Switch to self-play, then back to player-vs-player
            // Expected: Document expected behavior - forms should maintain their state
        });

        it('handles clicking Start multiple times in quick succession', async () => {
            // TODO: Implement test
            // Setup: Mock createGameRoom with delay
            // Action: Click Start button multiple times rapidly
            // Expected: createGameRoom should only be called once (or button should be disabled)
        });
    });

    describe('Accessibility', () => {
        it('all interactive elements are keyboard accessible', async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Tab through all elements
            // Expected: Can navigate and activate all buttons/inputs via keyboard, tab order is logical
        });

        it('form elements have proper ARIA labels', async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Query elements by role and label
            // Expected: All inputs have associated labels or ARIA labels
        });

        it('error messages are announced to screen readers', async () => {
            // TODO: Implement test
            // Setup: Trigger an error
            // Action: Check error element
            // Expected: Error has appropriate role (alert) for screen reader announcement
        });

        it('room type buttons have proper accessibility attributes', async () => {
            // TODO: Implement test
            // Setup: Default props
            // Action: Query room type buttons
            // Expected: Buttons have descriptive labels and proper roles
        });

        it('Start button has proper disabled state semantics', async () => {
            // TODO: Implement test
            // Setup: Mock loading state
            // Action: Check button attributes
            // Expected: Button has disabled attribute and appropriate ARIA attributes
        });
    });
});
