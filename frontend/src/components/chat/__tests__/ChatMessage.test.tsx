import { createMockChessGameMessage } from '@grouchess/test-utils';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import ChatMessage from '../ChatMessage';

const defaultMessage = createMockChessGameMessage({ content: 'Hello, world!' });
const defaultProps = {
    message: defaultMessage,
    currentPlayerId: defaultMessage.authorId,
    onDrawAccept: vi.fn(),
    onDrawDecline: vi.fn(),
    onRematchAccept: vi.fn(),
    onRematchDecline: vi.fn(),
};

describe('ChatMessage', () => {
    describe('standard messages', () => {
        it('renders message content', async () => {
            const screen = await render(<ChatMessage {...defaultProps} />);
            expect(screen.getByText('Hello, world!')).toBeInTheDocument();
        });

        it('renders timestamp for standard messages', async () => {
            const testDate = new Date('2024-01-15T14:30:00');
            const message = createMockChessGameMessage({
                content: 'Test message',
                createdAt: testDate,
            });
            const screen = await render(<ChatMessage {...defaultProps} message={message} />);
            expect(screen.getByText('2:30 PM')).toBeInTheDocument();
        });

        it.each([
            {
                scenario: 'morning time',
                date: new Date('2024-01-15T09:05:00'),
                expected: '9:05 AM',
            },
            {
                scenario: 'afternoon time',
                date: new Date('2024-01-15T15:45:00'),
                expected: '3:45 PM',
            },
            {
                scenario: 'midnight',
                date: new Date('2024-01-15T00:00:00'),
                expected: '12:00 AM',
            },
            {
                scenario: 'noon',
                date: new Date('2024-01-15T12:00:00'),
                expected: '12:00 PM',
            },
        ])('formats timestamp correctly for $scenario', async ({ date, expected }) => {
            const message = createMockChessGameMessage({
                content: 'Test',
                createdAt: date,
            });
            const screen = await render(<ChatMessage {...defaultProps} message={message} />);
            expect(screen.getByText(expected)).toBeInTheDocument();
        });

        it('renders message from current user', async () => {
            const message = createMockChessGameMessage({ content: 'My message' });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId={message.authorId} />
            );
            expect(screen.getByText('My message')).toBeInTheDocument();
        });

        it('renders message from other user', async () => {
            const message = createMockChessGameMessage({ content: 'Other message' });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId="different-player" />
            );
            expect(screen.getByText('Other message')).toBeInTheDocument();
        });
    });

    describe('draw offer messages', () => {
        it('shows "You offered a draw..." for current user', async () => {
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId={message.authorId} />
            );
            expect(screen.getByText('You offered a draw...')).toBeInTheDocument();
        });

        it('shows original content for other user', async () => {
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId="different-player" />
            );
            expect(screen.getByText('Player offered a draw')).toBeInTheDocument();
        });

        it('renders Accept and Decline buttons for other user', async () => {
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId="different-player" />
            );
            expect(screen.getByRole('button', { name: 'Accept draw offer' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Decline draw offer' })).toBeInTheDocument();
        });

        it('calls onDrawAccept when Accept button is clicked', async () => {
            const onDrawAccept = vi.fn();
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
            });
            const screen = await render(
                <ChatMessage
                    {...defaultProps}
                    message={message}
                    currentPlayerId="different-player"
                    onDrawAccept={onDrawAccept}
                />
            );
            const acceptButton = screen.getByRole('button', { name: 'Accept draw offer' });
            await userEvent.click(acceptButton);
            expect(onDrawAccept).toHaveBeenCalledTimes(1);
        });

        it('calls onDrawDecline when Decline button is clicked', async () => {
            const onDrawDecline = vi.fn();
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
            });
            const screen = await render(
                <ChatMessage
                    {...defaultProps}
                    message={message}
                    currentPlayerId="different-player"
                    onDrawDecline={onDrawDecline}
                />
            );
            const declineButton = screen.getByRole('button', { name: 'Decline draw offer' });
            await userEvent.click(declineButton);
            expect(onDrawDecline).toHaveBeenCalledTimes(1);
        });
    });

    describe('rematch offer messages', () => {
        it('shows "You offered a rematch..." for current user', async () => {
            const message = createMockChessGameMessage({
                type: 'rematch-offer',
                content: 'Player offered a rematch',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId={message.authorId} />
            );
            expect(screen.getByText('You offered a rematch...')).toBeInTheDocument();
        });

        it('shows original content for other user', async () => {
            const message = createMockChessGameMessage({
                type: 'rematch-offer',
                content: 'Player offered a rematch',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId="different-player" />
            );
            expect(screen.getByText('Player offered a rematch')).toBeInTheDocument();
        });

        it('renders Accept and Decline buttons for other user', async () => {
            const message = createMockChessGameMessage({
                type: 'rematch-offer',
                content: 'Player offered a rematch',
            });
            const screen = await render(
                <ChatMessage {...defaultProps} message={message} currentPlayerId="different-player" />
            );
            expect(screen.getByRole('button', { name: 'Accept rematch offer' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Decline rematch offer' })).toBeInTheDocument();
        });

        it('calls onRematchAccept when Accept button is clicked', async () => {
            const onRematchAccept = vi.fn();
            const message = createMockChessGameMessage({
                type: 'rematch-offer',
                content: 'Player offered a rematch',
            });
            const screen = await render(
                <ChatMessage
                    {...defaultProps}
                    message={message}
                    currentPlayerId="different-player"
                    onRematchAccept={onRematchAccept}
                />
            );
            const acceptButton = screen.getByRole('button', { name: 'Accept rematch offer' });
            await userEvent.click(acceptButton);
            expect(onRematchAccept).toHaveBeenCalledTimes(1);
        });

        it('calls onRematchDecline when Decline button is clicked', async () => {
            const onRematchDecline = vi.fn();
            const message = createMockChessGameMessage({
                type: 'rematch-offer',
                content: 'Player offered a rematch',
            });
            const screen = await render(
                <ChatMessage
                    {...defaultProps}
                    message={message}
                    currentPlayerId="different-player"
                    onRematchDecline={onRematchDecline}
                />
            );
            const declineButton = screen.getByRole('button', { name: 'Decline rematch offer' });
            await userEvent.click(declineButton);
            expect(onRematchDecline).toHaveBeenCalledTimes(1);
        });
    });

    describe('offer response messages', () => {
        it.each([
            { type: 'draw-accept' as const, content: 'Draw accepted' },
            { type: 'draw-decline' as const, content: 'Draw declined' },
            { type: 'rematch-accept' as const, content: 'Rematch accepted' },
            { type: 'rematch-decline' as const, content: 'Rematch declined' },
        ])('renders $type message correctly', async ({ type, content }) => {
            const message = createMockChessGameMessage({ type, content });
            const screen = await render(<ChatMessage {...defaultProps} message={message} />);
            expect(screen.getByText(content)).toBeInTheDocument();
        });

        it('renders response message without timestamp', async () => {
            const message = createMockChessGameMessage({
                type: 'draw-accept',
                content: 'Draw accepted',
                createdAt: new Date('2024-01-15T14:30:00'),
            });
            const screen = await render(<ChatMessage {...defaultProps} message={message} />);
            expect(screen.getByText('Draw accepted')).toBeInTheDocument();
        });
    });
});
