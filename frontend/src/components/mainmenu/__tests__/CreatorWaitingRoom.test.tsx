import type { Mock } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import * as windowUtils from '../../../utils/window';
import CreatorWaitingRoom from '../CreatorWaitingRoom';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/window', { spy: true });

let getLocationOriginSpy: Mock<() => string>;

describe('CreatorWaitingRoom', () => {
    const defaultProps = {
        roomId: 'test-room-123',
    };

    beforeEach(() => {
        mockNavigate.mockClear();
        getLocationOriginSpy = vi.spyOn(windowUtils, 'getLocationOrigin').mockReturnValue('https://grouchess.com');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('rendering', () => {
        it('renders title "Game Created!"', async () => {
            const { getByText } = await render(<CreatorWaitingRoom {...defaultProps} />);

            await expect.element(getByText('Game Created!')).toBeInTheDocument();
        });

        it('renders waiting message', async () => {
            const { getByText } = await render(<CreatorWaitingRoom {...defaultProps} />);

            await expect.element(getByText('Waiting for opponent to join...')).toBeInTheDocument();
        });

        it('renders auto-start message', async () => {
            const { getByText } = await render(<CreatorWaitingRoom {...defaultProps} />);

            await expect.element(getByText('The game will start automatically when someone joins')).toBeInTheDocument();
        });

        it('renders cancel button', async () => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Cancel Game' });
            await expect.element(button).toBeInTheDocument();
        });
    });

    describe('share URL functionality', () => {
        it('generates correct share URL from window.location.origin and roomId', async () => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const input = getByRole('textbox', {
                name: 'Share this link to invite a friend to play',
            });
            await expect.element(input).toHaveValue('https://grouchess.com/test-room-123');
        });

        it('renders CopyableTextField with correct label', async () => {
            const { getByText } = await render(<CreatorWaitingRoom {...defaultProps} />);

            await expect.element(getByText('Share this link to invite a friend to play')).toBeInTheDocument();
        });

        it('renders copy button with correct aria-label', async () => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Copy share URL' });
            await expect.element(button).toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'default origin',
                origin: 'https://grouchess.com',
                roomId: 'test-room-123',
                expected: 'https://grouchess.com/test-room-123',
            },
            {
                scenario: 'localhost',
                origin: 'http://localhost:3000',
                roomId: 'local-room',
                expected: 'http://localhost:3000/local-room',
            },
            {
                scenario: 'custom port',
                origin: 'http://example.com:8080',
                roomId: 'custom-room',
                expected: 'http://example.com:8080/custom-room',
            },
            {
                scenario: 'room ID with special characters',
                origin: 'https://grouchess.com',
                roomId: 'room-abc-123-xyz',
                expected: 'https://grouchess.com/room-abc-123-xyz',
            },
        ])('generates correct share URL for $scenario', async ({ origin, roomId, expected }) => {
            getLocationOriginSpy.mockReturnValue(origin);

            const { getByRole } = await render(<CreatorWaitingRoom roomId={roomId} />);

            const input = getByRole('textbox', {
                name: 'Share this link to invite a friend to play',
            });
            await expect.element(input).toHaveValue(expected);
        });
    });

    describe('cancel button functionality', () => {
        it('navigates to home page when cancel button is clicked', async () => {
            await render(<CreatorWaitingRoom {...defaultProps} />);

            const button = page.getByRole('button', { name: 'Cancel Game' });
            await expect.element(button).toHaveAttribute('type', 'button');
            await button.click();

            expect(mockNavigate).toHaveBeenCalledWith('/');
            expect(mockNavigate).toHaveBeenCalledTimes(1);
        });
    });

    describe('accessibility', () => {
        it('uses semantic heading for title', async () => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const heading = getByRole('heading', { name: 'Game Created!', level: 2 });
            await expect.element(heading).toBeInTheDocument();
        });

        it('has accessible button for canceling', async () => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const button = getByRole('button', { name: 'Cancel Game' });
            await expect.element(button).toBeInTheDocument();
        });

        it('provides accessible label for share URL input', async () => {
            const { getByLabelText } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const input = getByLabelText('Share this link to invite a friend to play');
            await expect.element(input).toBeInTheDocument();
        });
    });

    describe('edge cases', () => {
        it.each([
            {
                scenario: 'empty roomId',
                roomId: '',
                expected: 'https://grouchess.com/',
            },
            {
                scenario: 'very long roomId',
                roomId: 'x'.repeat(200),
                expected: `https://grouchess.com/${'x'.repeat(200)}`,
            },
            {
                scenario: 'roomId with URL-unsafe characters',
                roomId: 'room id with spaces & special chars!',
                expected: 'https://grouchess.com/room id with spaces & special chars!',
            },
        ])('handles $scenario', async ({ roomId, expected }) => {
            const { getByRole } = await render(<CreatorWaitingRoom roomId={roomId} />);

            const input = getByRole('textbox', {
                name: 'Share this link to invite a friend to play',
            });
            await expect.element(input).toHaveValue(expected);
        });
    });

    describe('component updates', () => {
        it('updates share URL when roomId prop changes', async () => {
            const { rerender, getByRole } = await render(<CreatorWaitingRoom roomId="room-1" />);

            let input = getByRole('textbox', {
                name: 'Share this link to invite a friend to play',
            });
            await expect.element(input).toHaveValue('https://grouchess.com/room-1');

            await rerender(<CreatorWaitingRoom roomId="room-2" />);

            input = getByRole('textbox', {
                name: 'Share this link to invite a friend to play',
            });
            await expect.element(input).toHaveValue('https://grouchess.com/room-2');
        });
    });

    describe('user interactions', () => {
        it.each([
            {
                description: 'allows clicking cancel button with keyboard navigation',
                key: '{Enter}',
            },
            {
                description: 'allows clicking cancel button with Space key',
                key: '{Space}',
            },
        ])('$description', async ({ key }) => {
            const { getByRole } = await render(<CreatorWaitingRoom {...defaultProps} />);

            const textInput = getByRole('textbox');
            const copyButton = getByRole('button', { name: 'Copy share URL' });
            const cancelButton = getByRole('button', { name: 'Cancel Game' });

            await userEvent.tab();
            await expect.element(textInput).toHaveFocus();
            await userEvent.tab();
            await expect.element(copyButton).toHaveFocus();
            await userEvent.tab();
            await expect.element(cancelButton).toHaveFocus();

            await userEvent.keyboard(key);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
