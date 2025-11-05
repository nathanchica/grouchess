import { createMockChessGameMessage } from '@grouchess/test-utils';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { PlayerChatSocketContext } from '../../../providers/PlayerChatSocketProvider';
import { createMockPlayerChatSocketContextValues } from '../../../providers/__mocks__/PlayerChatSocketProvider';
import PlayerChatPanel from '../PlayerChatPanel';

const defaultProps = {
    currentPlayerId: 'player-1',
};

const renderPlayerChatPanel = ({ propOverrides = {}, contextOverrides = {} } = {}) => {
    const contextValue = createMockPlayerChatSocketContextValues(contextOverrides);
    return render(
        <PlayerChatSocketContext.Provider value={contextValue}>
            <PlayerChatPanel {...defaultProps} {...propOverrides} />
        </PlayerChatSocketContext.Provider>
    );
};

describe('PlayerChatPanel', () => {
    describe('rendering', () => {
        it('renders empty message list when no messages', async () => {
            const { getByPlaceholder } = await renderPlayerChatPanel({ contextOverrides: { messages: [] } });
            await expect.element(getByPlaceholder('Message')).toBeInTheDocument();
        });

        it('renders all messages from socket provider', async () => {
            const messages = [
                createMockChessGameMessage({ content: 'First message', id: 'msg-1' }),
                createMockChessGameMessage({ content: 'Second message', id: 'msg-2' }),
                createMockChessGameMessage({ content: 'Third message', id: 'msg-3' }),
            ];
            const { getByText } = await renderPlayerChatPanel({ contextOverrides: { messages } });
            await expect.element(getByText('First message')).toBeInTheDocument();
            await expect.element(getByText('Second message')).toBeInTheDocument();
            await expect.element(getByText('Third message')).toBeInTheDocument();
        });

        it('passes correct props to ChatMessage components', async () => {
            const message = createMockChessGameMessage({ content: 'Test message', id: 'msg-1' });
            const { getByText } = await renderPlayerChatPanel({
                propOverrides: { currentPlayerId: 'player-1' },
                contextOverrides: { messages: [message] },
            });
            await expect.element(getByText('Test message')).toBeInTheDocument();
        });
    });

    describe('message input', () => {
        it('renders input field with placeholder', async () => {
            const { getByPlaceholder } = await renderPlayerChatPanel();
            await expect.element(getByPlaceholder('Message')).toBeInTheDocument();
        });

        it('enforces max message length of 140 characters', async () => {
            await renderPlayerChatPanel();
            const longMessage = 'a'.repeat(150);
            const input = page.getByPlaceholder('Message');
            await input.fill(longMessage);
            await expect.element(input).toHaveValue('a'.repeat(140));
        });
    });

    describe('character counter', () => {
        it('does not show character counter when input is empty', async () => {
            const { getByText } = await renderPlayerChatPanel();
            await expect.element(getByText(/\/140/)).not.toBeInTheDocument();
        });

        it('shows character counter when input has text', async () => {
            const { getByText } = await renderPlayerChatPanel();
            await page.getByPlaceholder('Message').fill('Hello');
            await expect.element(getByText('5/140')).toBeInTheDocument();
        });

        it('updates character counter as user types', async () => {
            const { getByText } = await renderPlayerChatPanel();
            const input = page.getByPlaceholder('Message');

            await input.fill('Hello');
            await expect.element(getByText('5/140')).toBeInTheDocument();

            await input.fill('Hello World');
            await expect.element(getByText('11/140')).toBeInTheDocument();
        });
    });

    describe('message submission', () => {
        it('sends message when Enter key is pressed', async () => {
            const sendStandardMessage = vi.fn();
            await renderPlayerChatPanel({
                contextOverrides: { sendStandardMessage },
            });
            const input = page.getByPlaceholder('Message');
            await input.fill('Test message');
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).toHaveBeenCalledWith('Test message');
        });

        it('clears input after sending message', async () => {
            const sendStandardMessage = vi.fn();
            await renderPlayerChatPanel({
                contextOverrides: { sendStandardMessage },
            });
            const input = page.getByPlaceholder('Message');
            await input.fill('Test message');
            await userEvent.keyboard('{Enter}');
            await expect.element(input).toHaveValue('');
        });

        it('trims whitespace before sending message', async () => {
            const sendStandardMessage = vi.fn();
            await renderPlayerChatPanel({
                contextOverrides: { sendStandardMessage },
            });
            const input = page.getByPlaceholder('Message');
            await input.fill('  Test message  ');
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
            await renderPlayerChatPanel({
                contextOverrides: { sendStandardMessage },
            });
            const inputField = page.getByPlaceholder('Message');
            await inputField.fill(input);
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).not.toHaveBeenCalled();
        });

        it('does not send message when currentPlayerId is not set', async () => {
            const sendStandardMessage = vi.fn();
            await renderPlayerChatPanel({
                propOverrides: { currentPlayerId: '' },
                contextOverrides: { sendStandardMessage },
            });
            const input = page.getByPlaceholder('Message');
            await input.fill('Test message');
            await userEvent.keyboard('{Enter}');
            expect(sendStandardMessage).not.toHaveBeenCalled();
        });
    });

    describe('auto-scroll behavior', () => {
        it('scrolls to bottom when messages change', async () => {
            const { rerender, getByText } = await renderPlayerChatPanel();

            // Add messages
            const messages = [createMockChessGameMessage({ content: 'New message', id: 'msg-1' })];

            await rerender(
                <PlayerChatSocketContext.Provider value={createMockPlayerChatSocketContextValues({ messages })}>
                    <PlayerChatPanel {...defaultProps} />
                </PlayerChatSocketContext.Provider>
            );

            // The scrollIntoView is called on the ref element
            // We can verify the message is rendered
            await expect.element(getByText('New message')).toBeInViewport();
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

            await renderPlayerChatPanel({
                propOverrides: { currentPlayerId: 'different-player' },
                contextOverrides: {
                    messages: [message],
                    acceptDrawOffer,
                    declineDrawOffer,
                    acceptRematchOffer,
                    declineRematchOffer,
                },
            });

            await page.getByRole('button', { name: 'Accept draw offer' }).click();
            expect(acceptDrawOffer).toHaveBeenCalledTimes(1);
        });

        it('passes currentPlayerId to ChatMessage components', async () => {
            const message = createMockChessGameMessage({
                content: 'Test message',
                id: 'msg-1',
                authorId: 'player-1',
            });
            const { getByText } = await renderPlayerChatPanel({
                propOverrides: { currentPlayerId: 'player-1' },
                contextOverrides: { messages: [message] },
            });
            await expect.element(getByText('Test message')).toBeInTheDocument();
        });
    });
});
