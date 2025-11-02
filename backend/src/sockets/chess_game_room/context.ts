import { CreateContextArgs, HandlerBaseContext, HandlerContext } from './types.js';
import { createSendErrorEvent, createEndChessGameEvent, createSendNewMessageEvent } from './utils.js';

export function createContext({ io, socket, playerId, roomId, services }: CreateContextArgs): HandlerContext {
    const baseContext: HandlerBaseContext = {
        io,
        socket,
        playerId,
        roomId,
        services,
        targets: {
            self: `player:${playerId}`,
            gameRoom: `room:${roomId}`,
        },
    };

    return {
        ...baseContext,
        sendErrorEvent: createSendErrorEvent(baseContext),
        createNewMessage: createSendNewMessageEvent(baseContext),
        endChessGame: createEndChessGameEvent(baseContext),
    };
}
