import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Message } from '@grouchess/models';
import {
    NewMessagePayloadSchema,
    OfferResponsePayloadSchema,
    type OfferResponsePayload,
    type NewMessagePayload,
} from '@grouchess/socket-events';
import invariant from 'tiny-invariant';

import { useSocket } from './SocketProvider';

type PlayerChatSocketContextType = {
    messages: Message[];
    isAwaitingRematchResponse: boolean;
    sendStandardMessage: (content: string) => void;
    sendRematchOffer: () => void;
    acceptDrawOffer: () => void;
    declineDrawOffer: () => void;
    acceptRematchOffer: () => void;
    declineRematchOffer: () => void;
};

const PlayerChatSocketContext = createContext<PlayerChatSocketContextType>({
    messages: [],
    isAwaitingRematchResponse: false,
    sendStandardMessage: () => {},
    sendRematchOffer: () => {},
    acceptDrawOffer: () => {},
    declineDrawOffer: () => {},
    acceptRematchOffer: () => {},
    declineRematchOffer: () => {},
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
    const [isAwaitingRematchResponse, setIsAwaitingRematchResponse] = useState<boolean>(false);

    const sendStandardMessage = useCallback(
        (content: string) => {
            socket.emit('send_message', { content, type: 'standard' });
        },
        [socket]
    );

    const sendRematchOffer = useCallback(() => {
        setIsAwaitingRematchResponse(true);
        socket.emit('offer_rematch');
    }, [socket]);

    const acceptDrawOffer = useCallback(() => {
        socket.emit('accept_draw');
    }, [socket]);

    const declineDrawOffer = useCallback(() => {
        socket.emit('decline_draw');
    }, [socket]);

    const acceptRematchOffer = useCallback(() => {
        socket.emit('offer_rematch'); // Accepting a rematch is done by offering one back
    }, [socket]);

    const declineRematchOffer = useCallback(() => {
        socket.emit('decline_rematch');
    }, [socket]);

    const onNewMessage = useCallback((payload: NewMessagePayload) => {
        const { message } = NewMessagePayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = [...prevMessages, message];
            return formatMessages(newMessages);
        });
    }, []);

    const onOfferResponse = useCallback((payload: OfferResponsePayload) => {
        const { message } = OfferResponsePayloadSchema.parse(payload);
        setMessages((prevMessages) => {
            const newMessages = prevMessages.map((msg) => (msg.id === message.id ? message : msg));
            return formatMessages(newMessages);
        });

        if (message.type === 'rematch-decline' || message.type === 'rematch-accept') {
            setIsAwaitingRematchResponse(false);
        }
    }, []);

    useEffect(() => {
        socket.on('new_message', onNewMessage);
        socket.on('draw_declined', onOfferResponse);
        socket.on('draw_accepted', onOfferResponse);
        socket.on('rematch_declined', onOfferResponse);
        socket.on('rematch_accepted', onOfferResponse);

        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('draw_declined', onOfferResponse);
            socket.off('draw_accepted', onOfferResponse);
            socket.off('rematch_declined', onOfferResponse);
            socket.off('rematch_accepted', onOfferResponse);
        };
    }, [onNewMessage, onOfferResponse, socket]);

    const value = useMemo(
        () => ({
            messages,
            isAwaitingRematchResponse,
            sendStandardMessage,
            sendRematchOffer,
            acceptDrawOffer,
            declineDrawOffer,
            acceptRematchOffer,
            declineRematchOffer,
        }),
        [
            messages,
            isAwaitingRematchResponse,
            sendStandardMessage,
            sendRematchOffer,
            acceptDrawOffer,
            declineDrawOffer,
            acceptRematchOffer,
            declineRematchOffer,
        ]
    );

    return <PlayerChatSocketContext.Provider value={value}>{children}</PlayerChatSocketContext.Provider>;
}

export default PlayerChatSocketProvider;
