import type { ReactNode } from 'react';

import type { ChessGameMessage } from '@grouchess/models';
import { createMockChessGameMessage } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import type { SocketType } from '../../socket';
import PlayerChatSocketProvider, { usePlayerChatSocket } from '../PlayerChatSocketProvider';
import { SocketContext } from '../SocketProvider';
import { createMockSocketContextValues } from '../__mocks__/SocketProvider';

const PlayerChatSocketConsumer = () => {
    const {
        messages,
        isAwaitingRematchResponse,
        sendStandardMessage,
        sendRematchOffer,
        acceptDrawOffer,
        declineDrawOffer,
        acceptRematchOffer,
        declineRematchOffer,
    } = usePlayerChatSocket();

    return (
        <div data-testid="player-chat-socket-consumer">
            <span data-testid="messages-count">{messages.length}</span>
            <span data-testid="is-awaiting-rematch">{isAwaitingRematchResponse ? 'true' : 'false'}</span>
            <div data-testid="messages-list">
                {messages.map((msg) => (
                    <div key={msg.id} data-testid={`message-${msg.id}`}>
                        {msg.type}:{msg.content}
                    </div>
                ))}
            </div>
            <button data-testid="send-standard-message" onClick={() => sendStandardMessage('Hello')}>
                Send Message
            </button>
            <button data-testid="send-rematch-offer" onClick={sendRematchOffer}>
                Send Rematch Offer
            </button>
            <button data-testid="accept-draw-offer" onClick={acceptDrawOffer}>
                Accept Draw
            </button>
            <button data-testid="decline-draw-offer" onClick={declineDrawOffer}>
                Decline Draw
            </button>
            <button data-testid="accept-rematch-offer" onClick={acceptRematchOffer}>
                Accept Rematch
            </button>
            <button data-testid="decline-rematch-offer" onClick={declineRematchOffer}>
                Decline Rematch
            </button>
        </div>
    );
};

type RenderPlayerChatSocketProviderOptions = {
    initialMessages?: ChessGameMessage[];
    children?: ReactNode;
};

async function renderPlayerChatSocketProvider({
    initialMessages = [],
    children = <PlayerChatSocketConsumer />,
}: RenderPlayerChatSocketProviderOptions = {}) {
    const mockSocket = {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
    };

    const socketContextValues = createMockSocketContextValues({
        socket: mockSocket as unknown as SocketType,
    });

    const result = await render(
        <SocketContext.Provider value={socketContextValues}>
            <PlayerChatSocketProvider initialMessages={initialMessages}>{children}</PlayerChatSocketProvider>
        </SocketContext.Provider>
    );

    return {
        ...result,
        mockSocket,
    };
}

describe('PlayerChatSocketProvider', () => {
    it('exposes initial chat messages and rematch state from props', async () => {
        const initialMessages = [
            createMockChessGameMessage({ id: 'msg-1', content: 'Hello' }),
            createMockChessGameMessage({ id: 'msg-2', content: 'Hi there' }),
        ];

        const { getByTestId } = await renderPlayerChatSocketProvider({ initialMessages });

        const messagesCount = getByTestId('messages-count');
        const isAwaitingRematch = getByTestId('is-awaiting-rematch');

        await expect.element(messagesCount).toHaveTextContent('2');
        await expect.element(isAwaitingRematch).toHaveTextContent('false');

        const message1 = getByTestId('message-msg-1');
        const message2 = getByTestId('message-msg-2');
        await expect.element(message1).toBeInTheDocument();
        await expect.element(message2).toBeInTheDocument();
    });

    it('sends standard chat messages over the socket when sendStandardMessage is invoked', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const sendButton = getByTestId('send-standard-message');
        await sendButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('send_message', { content: 'Hello', type: 'standard' });
    });

    it('sends a rematch offer and marks the chat as awaiting a rematch response', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const isAwaitingRematch = getByTestId('is-awaiting-rematch');
        await expect.element(isAwaitingRematch).toHaveTextContent('false');

        const sendRematchButton = getByTestId('send-rematch-offer');
        await sendRematchButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('offer_rematch');
        await expect.element(isAwaitingRematch).toHaveTextContent('true');
    });

    it('accepts a draw offer through the socket', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const acceptDrawButton = getByTestId('accept-draw-offer');
        await acceptDrawButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('accept_draw');
    });

    it('declines a draw offer through the socket', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const declineDrawButton = getByTestId('decline-draw-offer');
        await declineDrawButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('decline_draw');
    });

    it('accepts a rematch by sending a reciprocal rematch offer', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const acceptRematchButton = getByTestId('accept-rematch-offer');
        await acceptRematchButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('offer_rematch');
    });

    it('declines a rematch offer through the socket', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const declineRematchButton = getByTestId('decline-rematch-offer');
        await declineRematchButton.click();

        expect(mockSocket.emit).toHaveBeenCalledWith('decline_rematch');
    });

    it('subscribes to chat-related socket events on mount and unsubscribes on unmount', async () => {
        const { mockSocket, unmount } = await renderPlayerChatSocketProvider();

        expect(mockSocket.on).toHaveBeenCalledWith('new_message', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('draw_declined', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('draw_accepted', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('rematch_declined', expect.any(Function));
        expect(mockSocket.on).toHaveBeenCalledWith('rematch_accepted', expect.any(Function));

        const newMessageCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'new_message')?.[1];
        const drawDeclinedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'draw_declined')?.[1];
        const drawAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'draw_accepted')?.[1];
        const rematchDeclinedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'rematch_declined')?.[1];
        const rematchAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'rematch_accepted')?.[1];

        unmount();

        expect(mockSocket.off).toHaveBeenCalledWith('new_message', newMessageCallback);
        expect(mockSocket.off).toHaveBeenCalledWith('draw_declined', drawDeclinedCallback);
        expect(mockSocket.off).toHaveBeenCalledWith('draw_accepted', drawAcceptedCallback);
        expect(mockSocket.off).toHaveBeenCalledWith('rematch_declined', rematchDeclinedCallback);
        expect(mockSocket.off).toHaveBeenCalledWith('rematch_accepted', rematchAcceptedCallback);
    });

    it('appends new chat messages from new_message events, sorted by created time and limited to the most recent messages', async () => {
        const initialMessages = [
            createMockChessGameMessage({ id: 'msg-1', createdAt: new Date('2024-01-01T00:00:00Z') }),
        ];

        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider({ initialMessages });

        const newMessageCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'new_message')?.[1];
        if (!newMessageCallback) throw new Error('new_message callback not found');

        // Add a message with an earlier timestamp (should be sorted before existing)
        newMessageCallback({
            message: createMockChessGameMessage({ id: 'msg-0', createdAt: new Date('2023-12-31T23:59:59Z') }),
        });

        // Add a message with a later timestamp (should be sorted after existing)
        newMessageCallback({
            message: createMockChessGameMessage({ id: 'msg-2', createdAt: new Date('2024-01-01T00:01:00Z') }),
        });

        const messagesCount = getByTestId('messages-count');
        await expect.element(messagesCount).toHaveTextContent('3');

        // Verify messages are sorted by createdAt (oldest first)
        const messagesList = getByTestId('messages-list');
        const messages = messagesList.element().children;
        expect(messages[0]).toHaveAttribute('data-testid', 'message-msg-0');
        expect(messages[1]).toHaveAttribute('data-testid', 'message-msg-1');
        expect(messages[2]).toHaveAttribute('data-testid', 'message-msg-2');
    });

    it('limits messages to the most recent 100 entries', async () => {
        // Create 99 initial messages
        const initialMessages = Array.from({ length: 99 }, (_, i) =>
            createMockChessGameMessage({
                id: `msg-${i}`,
                createdAt: new Date(`2024-01-01T00:${String(i).padStart(2, '0')}:00Z`),
            })
        );

        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider({ initialMessages });

        const messagesCount = getByTestId('messages-count');
        await expect.element(messagesCount).toHaveTextContent('99');

        // Add 2 more messages via socket events to exceed the limit
        const newMessageCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'new_message')?.[1];
        if (!newMessageCallback) throw new Error('new_message callback not found');

        newMessageCallback({
            message: createMockChessGameMessage({
                id: 'msg-99',
                createdAt: new Date('2024-01-01T01:39:00Z'),
            }),
        });

        await expect.element(messagesCount).toHaveTextContent('100');

        newMessageCallback({
            message: createMockChessGameMessage({
                id: 'msg-100',
                createdAt: new Date('2024-01-01T01:40:00Z'),
            }),
        });

        // Should still be limited to 100 messages
        await expect.element(messagesCount).toHaveTextContent('100');

        // The first message (msg-0) should be removed, msg-1 should be the first
        const firstRemovedMessage = getByTestId('message-msg-0');
        await expect.element(firstRemovedMessage).not.toBeInTheDocument();

        const firstMessage = getByTestId('message-msg-1');
        await expect.element(firstMessage).toBeInTheDocument();
    });

    it('updates existing messages when offer response events arrive with matching message identifiers', async () => {
        const initialMessages = [createMockChessGameMessage({ id: 'msg-1', type: 'draw-offer', content: undefined })];

        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider({ initialMessages });

        const drawAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'draw_accepted')?.[1];
        if (!drawAcceptedCallback) throw new Error('draw_accepted callback not found');

        // Update the message to draw-accept
        drawAcceptedCallback({
            message: createMockChessGameMessage({ id: 'msg-1', type: 'draw-accept', content: undefined }),
        });

        const messagesCount = getByTestId('messages-count');
        await expect.element(messagesCount).toHaveTextContent('1');

        const updatedMessage = getByTestId('message-msg-1');
        await expect.element(updatedMessage).toHaveTextContent('draw-accept:');
    });

    it('ignores offer response events whose message identifiers do not match existing messages', async () => {
        const initialMessages = [createMockChessGameMessage({ id: 'msg-1', type: 'draw-offer', content: undefined })];

        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider({ initialMessages });

        const drawAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'draw_accepted')?.[1];
        if (!drawAcceptedCallback) throw new Error('draw_accepted callback not found');

        // Try to update a non-existent message
        drawAcceptedCallback({
            message: createMockChessGameMessage({ id: 'msg-999', type: 'draw-accept', content: undefined }),
        });

        const messagesCount = getByTestId('messages-count');
        // Should still only have 1 message (the original)
        await expect.element(messagesCount).toHaveTextContent('1');

        const originalMessage = getByTestId('message-msg-1');
        await expect.element(originalMessage).toHaveTextContent('draw-offer:');
    });

    it('clears the awaiting rematch flag when handling rematch_accepted offer responses', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        // First, send a rematch offer to set the flag
        const sendRematchButton = getByTestId('send-rematch-offer');
        await sendRematchButton.click();

        const isAwaitingRematch = getByTestId('is-awaiting-rematch');
        await expect.element(isAwaitingRematch).toHaveTextContent('true');

        // Now simulate receiving a rematch_accepted response
        const rematchAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'rematch_accepted')?.[1];
        if (!rematchAcceptedCallback) throw new Error('rematch_accepted callback not found');

        rematchAcceptedCallback({
            message: createMockChessGameMessage({ id: 'msg-1', type: 'rematch-accept', content: undefined }),
        });

        await expect.element(isAwaitingRematch).toHaveTextContent('false');
    });

    it('clears the awaiting rematch flag when handling rematch_declined offer responses', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        // First, send a rematch offer to set the flag
        const sendRematchButton = getByTestId('send-rematch-offer');
        await sendRematchButton.click();

        const isAwaitingRematch = getByTestId('is-awaiting-rematch');
        await expect.element(isAwaitingRematch).toHaveTextContent('true');

        // Now simulate receiving a rematch_declined response
        const rematchDeclinedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'rematch_declined')?.[1];
        if (!rematchDeclinedCallback) throw new Error('rematch_declined callback not found');

        rematchDeclinedCallback({
            message: createMockChessGameMessage({ id: 'msg-1', type: 'rematch-decline', content: undefined }),
        });

        await expect.element(isAwaitingRematch).toHaveTextContent('false');
    });

    it('does not change the awaiting rematch flag for non-rematch offer responses', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        // First, send a rematch offer to set the flag
        const sendRematchButton = getByTestId('send-rematch-offer');
        await sendRematchButton.click();

        const isAwaitingRematch = getByTestId('is-awaiting-rematch');
        await expect.element(isAwaitingRematch).toHaveTextContent('true');

        // Now simulate receiving a draw_accepted response (non-rematch)
        const drawAcceptedCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'draw_accepted')?.[1];
        if (!drawAcceptedCallback) throw new Error('draw_accepted callback not found');

        drawAcceptedCallback({
            message: createMockChessGameMessage({ id: 'msg-1', type: 'draw-accept', content: undefined }),
        });

        // The flag should still be true
        await expect.element(isAwaitingRematch).toHaveTextContent('true');
    });

    it('provides updated context values after chat messages and offer responses are processed', async () => {
        const { getByTestId, mockSocket } = await renderPlayerChatSocketProvider();

        const messagesCount = getByTestId('messages-count');
        await expect.element(messagesCount).toHaveTextContent('0');

        // Add a new message
        const newMessageCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'new_message')?.[1];
        if (!newMessageCallback) throw new Error('new_message callback not found');

        newMessageCallback({
            message: createMockChessGameMessage({ id: 'msg-1', content: 'New message' }),
        });

        await expect.element(messagesCount).toHaveTextContent('1');

        const message = getByTestId('message-msg-1');
        await expect.element(message).toBeInTheDocument();
    });
});

describe('usePlayerChatSocket', () => {
    it('returns chat socket context values when used within PlayerChatSocketProvider', async () => {
        const { getByTestId } = await renderPlayerChatSocketProvider();

        const consumer = getByTestId('player-chat-socket-consumer');
        await expect.element(consumer).toBeInTheDocument();

        const messagesCount = getByTestId('messages-count');
        await expect.element(messagesCount).toBeInTheDocument();
    });

    it('throws an invariant error when used outside of PlayerChatSocketProvider', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<PlayerChatSocketConsumer />);
        }).rejects.toThrow('usePlayerChatSocket must be used within PlayerChatSocketProvider');
    });
});
