import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Message } from '@grouchess/game-room';
import { NewMessagePayloadSchema, type NewMessagePayload } from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { useSocket } from './SocketProvider';

type PlayerChatSocketContextType = {
    messages: Message[];
    sendStandardMessage: (content: string) => void;
};

const PlayerChatSocketContext = createContext<PlayerChatSocketContextType>({
    messages: [],
    sendStandardMessage: () => {},
});

const MAX_MESSAGES = 100;

/**
 * Formats and limits messages to the most recent MAX_MESSAGES entries.
 * For HTTP and socket payloads we coerce `createdAt` to Date at parse time; this util
 * can still transform if needed when `skipTransformingDates` is false.
 */
function formatMessages(messages: Message[], skipTransformingDates: boolean = false): Message[] {
    let formattedMessages = [...messages];
    if (!skipTransformingDates) {
        formattedMessages = formattedMessages.map((msg) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
        }));
    }

    return formattedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).slice(-MAX_MESSAGES);
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

    const onNewMessage = useCallback((payload: NewMessagePayload) => {
        const { message } = NewMessagePayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages, message];
            return formatMessages(newMessages, true);
        });
    }, []);

    useEffect(() => {
        socket.on('new_message', onNewMessage);

        return () => {
            socket.off('new_message', onNewMessage);
        };
    }, [onNewMessage, socket]);

    const value = useMemo(() => ({ messages, sendStandardMessage }), [messages, sendStandardMessage]);

    return <PlayerChatSocketContext.Provider value={value}>{children}</PlayerChatSocketContext.Provider>;
}

export default PlayerChatSocketProvider;
