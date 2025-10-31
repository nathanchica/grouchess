import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Message } from '@grouchess/game-room';
import {
    NewMessagePayloadSchema,
    DrawAcceptedPayloadSchema,
    DrawDeclinedPayloadSchema,
    type DrawAcceptedPayload,
    type DrawDeclinedPayload,
    type NewMessagePayload,
} from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { useSocket } from './SocketProvider';

type PlayerChatSocketContextType = {
    messages: Message[];
    sendStandardMessage: (content: string) => void;
    acceptDrawOffer: () => void;
    declineDrawOffer: () => void;
};

const PlayerChatSocketContext = createContext<PlayerChatSocketContextType>({
    messages: [],
    sendStandardMessage: () => {},
    acceptDrawOffer: () => {},
    declineDrawOffer: () => {},
});

const MAX_MESSAGES = 100;

/**
 * Limits messages to the most recent MAX_MESSAGES entries and sorts them by oldest first.
 */
function formatMessages(messages: Message[]): Message[] {
    return [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-MAX_MESSAGES);
}

export function usePlayerChatSocket(): PlayerChatSocketContextType {
    const context = useContext(PlayerChatSocketContext);
    invariant(context, 'usePlayerChatSocket must be used within PlayerChatSocketProvider');
    return context;
}

type Props = {
    initialMessages: Message[];
    children: ReactNode;
};

function PlayerChatSocketProvider({ initialMessages, children }: Props) {
    const { socket } = useSocket();
    const [messages, setMessages] = useState<Message[]>(initialMessages);

    const sendStandardMessage = useCallback(
        (content: string) => {
            socket.emit('send_message', { content, type: 'standard' });
        },
        [socket]
    );

    const acceptDrawOffer = useCallback(() => {
        socket.emit('accept_draw');
    }, [socket]);

    const declineDrawOffer = useCallback(() => {
        socket.emit('decline_draw');
    }, [socket]);

    const onNewMessage = useCallback((payload: NewMessagePayload) => {
        const { message } = NewMessagePayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages, message];
            return formatMessages(newMessages);
        });
    }, []);

    const onDrawDeclined = useCallback((payload: DrawDeclinedPayload) => {
        const { message } = DrawDeclinedPayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = prevMessages.map((msg) => (msg.id === message.id ? message : msg));
            return formatMessages(newMessages);
        });
    }, []);

    const onDrawAccepted = useCallback((payload: DrawAcceptedPayload) => {
        const { message } = DrawAcceptedPayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = prevMessages.map((msg) => (msg.id === message.id ? message : msg));
            return formatMessages(newMessages);
        });
    }, []);

    useEffect(() => {
        socket.on('new_message', onNewMessage);
        socket.on('draw_declined', onDrawDeclined);
        socket.on('draw_accepted', onDrawAccepted);

        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('draw_declined', onDrawDeclined);
            socket.off('draw_accepted', onDrawAccepted);
        };
    }, [onNewMessage, onDrawDeclined, onDrawAccepted, socket]);

    const value = useMemo(
        () => ({ messages, sendStandardMessage, acceptDrawOffer, declineDrawOffer }),
        [messages, sendStandardMessage, acceptDrawOffer, declineDrawOffer]
    );

    return <PlayerChatSocketContext.Provider value={value}>{children}</PlayerChatSocketContext.Provider>;
}

export default PlayerChatSocketProvider;
