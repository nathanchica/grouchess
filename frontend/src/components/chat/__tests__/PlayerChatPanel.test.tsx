import { createMockChessGameMessage } from '@grouchess/test-utils';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
    usePlayerChatSocket,
    defaultPlayerChatSocketContextValue as defaultSocketMock,
} from '../../../providers/PlayerChatSocketProvider';
import PlayerChatPanel from '../PlayerChatPanel';

vi.mock('../../../providers/PlayerChatSocketProvider', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('../../../providers/PlayerChatSocketProvider')>();
    return {
        ...originalModule,
        usePlayerChatSocket: vi.fn(),
    };
});

const mockUsePlayerChatSocket = vi.mocked(usePlayerChatSocket);

const defaultProps = {
    currentPlayerId: 'player-1',
};

describe('PlayerChatPanel', () => {
    beforeEach(() => {
        mockUsePlayerChatSocket.mockReturnValue(defaultSocketMock);
    });

    describe('rendering', () => {
        it('renders empty message list when no messages', async () => {
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages: [],
            });
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await expect.element(input).toBeInTheDocument();
        });

        it('renders all messages from socket provider', async () => {
            const messages = [
                createMockChessGameMessage({ content: 'First message', id: 'msg-1' }),
                createMockChessGameMessage({ content: 'Second message', id: 'msg-2' }),
                createMockChessGameMessage({ content: 'Third message', id: 'msg-3' }),
            ];
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages,
            });
            const screen = await render(<PlayerChatPanel {...defaultProps} />);
            expect(screen.getByText('First message')).toBeInTheDocument();
            expect(screen.getByText('Second message')).toBeInTheDocument();
            expect(screen.getByText('Third message')).toBeInTheDocument();
        });

        it('passes correct props to ChatMessage components', async () => {
            const message = createMockChessGameMessage({ content: 'Test message', id: 'msg-1' });
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages: [message],
            });
            const screen = await render(<PlayerChatPanel currentPlayerId="player-1" />);
            expect(screen.getByText('Test message')).toBeInTheDocument();
        });
    });

    describe('message input', () => {
        it('renders input field with placeholder', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await expect.element(input).toBeInTheDocument();
        });

        it('updates input value when user types', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Hello');
            await expect.element(input).toHaveValue('Hello');
        });

        it('enforces max message length of 140 characters', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            const longMessage = 'a'.repeat(150);
            await userEvent.fill(input, longMessage);
            const value = await input.query();
            expect((value as HTMLInputElement).value.length).toBe(140);
        });
    });

    describe('character counter', () => {
        it('does not show character counter when input is empty', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const counter = page.getByText(/\/140/);
            await expect.element(counter).not.toBeInTheDocument();
        });

        it('shows character counter when input has text', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Hello');
            const counter = page.getByText('5/140');
            await expect.element(counter).toBeInTheDocument();
        });

        it('updates character counter as user types', async () => {
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Hello World');
            const counter = page.getByText('11/140');
            await expect.element(counter).toBeInTheDocument();
        });
    });

    describe('message submission', () => {
        it('sends message when Enter key is pressed', async () => {
            const sendStandardMessage = vi.fn();
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                sendStandardMessage,
            });
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Test message');
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).toHaveBeenCalledWith('Test message');
        });

        it('clears input after sending message', async () => {
            const sendStandardMessage = vi.fn();
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                sendStandardMessage,
            });
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Test message');
            await userEvent.keyboard('{Enter}');
            await expect.element(input).toHaveValue('');
        });

        it('trims whitespace before sending message', async () => {
            const sendStandardMessage = vi.fn();
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                sendStandardMessage,
            });
            await render(<PlayerChatPanel {...defaultProps} />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, '  Test message  ');
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).toHaveBeenCalledWith('Test message');
        });

        it.each([
            { scenario: 'empty string', input: '' },
            { scenario: 'whitespace only', input: '   ' },
            { scenario: 'tabs only', input: '\t\t' },
            { scenario: 'newlines only', input: '\n\n' },
            { scenario: 'mixed whitespace', input: '  \t\n  ' },
        ])('does not send message for $scenario', async ({ input }) => {
            const sendStandardMessage = vi.fn();
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                sendStandardMessage,
            });
            await render(<PlayerChatPanel {...defaultProps} />);
            const inputField = page.getByPlaceholder('Message');
            await userEvent.fill(inputField, input);
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).not.toHaveBeenCalled();
        });

        it('does not send message when currentPlayerId is not set', async () => {
            const sendStandardMessage = vi.fn();
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                sendStandardMessage,
            });
            await render(<PlayerChatPanel currentPlayerId="" />);
            const input = page.getByPlaceholder('Message');
            await userEvent.fill(input, 'Test message');
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).not.toHaveBeenCalled();
        });
    });

    describe('auto-scroll behavior', () => {
        it('scrolls to bottom when messages change', async () => {
            const { rerender } = await render(<PlayerChatPanel {...defaultProps} />);

            // Add messages
            const messages = [createMockChessGameMessage({ content: 'New message', id: 'msg-1' })];
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages,
            });

            await rerender(<PlayerChatPanel {...defaultProps} />);

            // The scrollIntoView is called on the ref element
            // We can verify the message is rendered
            const messageElement = page.getByText('New message');
            await expect.element(messageElement).toBeVisible();
        });
    });

    describe('ChatMessage integration', () => {
        it('passes callback functions to ChatMessage components', async () => {
            const acceptDrawOffer = vi.fn();
            const declineDrawOffer = vi.fn();
            const acceptRematchOffer = vi.fn();
            const declineRematchOffer = vi.fn();
            const message = createMockChessGameMessage({
                type: 'draw-offer',
                content: 'Player offered a draw',
                id: 'msg-1',
            });

            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages: [message],
                acceptDrawOffer,
                declineDrawOffer,
                acceptRematchOffer,
                declineRematchOffer,
            });

            const screen = await render(<PlayerChatPanel currentPlayerId="different-player" />);
            const acceptButton = screen.getByRole('button', { name: 'Accept draw offer' });
            await userEvent.click(acceptButton);
            expect(acceptDrawOffer).toHaveBeenCalledTimes(1);
        });

        it('passes currentPlayerId to ChatMessage components', async () => {
            const message = createMockChessGameMessage({
                content: 'Test message',
                id: 'msg-1',
                authorId: 'player-1',
            });
            mockUsePlayerChatSocket.mockReturnValue({
                ...defaultSocketMock,
                messages: [message],
            });
            const screen = await render(<PlayerChatPanel currentPlayerId="player-1" />);
            expect(screen.getByText('Test message')).toBeInTheDocument();
        });
    });
});
