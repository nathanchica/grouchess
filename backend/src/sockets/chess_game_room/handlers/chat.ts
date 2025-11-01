import {
    SendMessageInputSchema,
    type SendMessageInput,
    TypingEventInputSchema,
    type TypingEventInput,
} from '@grouchess/socket-events';

import { HandlerContext } from '../types.js';
import { createEventHandler } from '../utils.js';

function onSendMessage(input: SendMessageInput, context: HandlerContext) {
    const { type, content } = input;
    const { sendErrorEvent, createNewMessage } = context;

    if (type === 'standard' && !content?.trim()) {
        sendErrorEvent('Message content cannot be empty');
        return;
    }

    createNewMessage(type, content);
}

function onTyping(input: TypingEventInput, context: HandlerContext) {
    const { isTyping } = input;
    const { socket, targets, playerId } = context;
    const { gameRoom: gameRoomTarget } = targets;
    socket.to(gameRoomTarget).emit('user_typing', { playerId, isTyping });
}

export function registerChatHandlers(context: HandlerContext) {
    const { socket } = context;

    socket.on(
        'send_message',
        createEventHandler({
            eventName: 'send_message',
            context,
            inputSchema: SendMessageInputSchema,
            invalidInputMessage: 'Invalid send_message input',
            failureMessage: 'Failed to send message',
            handlerFunction: onSendMessage,
        })
    );

    socket.on(
        'typing',
        createEventHandler({
            eventName: 'typing',
            context,
            inputSchema: TypingEventInputSchema,
            invalidInputMessage: 'Invalid typing input',
            failureMessage: 'Failed to broadcast typing status',
            handlerFunction: onTyping,
        })
    );
}
