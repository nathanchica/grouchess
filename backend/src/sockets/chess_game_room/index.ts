import { createContext } from './context.js';
import { registerChatHandlers } from './handlers/chat.js';
import { registerDisconnectHandler } from './handlers/disconnect.js';
import { registerLifecycleHandlers } from './handlers/lifecycle.js';
import { registerMoveHandlers } from './handlers/moves.js';
import { registerOffersHandlers } from './handlers/offers.js';
import type { ChessGameRoomSocketDependencies } from './types.js';

import { createAuthenticateSocket } from '../../middleware/authenticateSocket.js';
import type { ChessSocketServer } from '../../servers/chess.js';

export function createChessGameRoomSocketHandler(services: ChessGameRoomSocketDependencies) {
    return function initializeChessGameRoomSocket(io: ChessSocketServer) {
        // Apply authentication middleware to all connections
        io.use(createAuthenticateSocket({ tokenService: services.tokenService }));

        io.on('connection', (socket) => {
            // playerId and roomId provided by authentication middleware
            const { playerId, roomId } = socket.data;

            const context = createContext({ io, socket, playerId, roomId, services });
            const { targets, sendErrorEvent } = context;

            // verify player exists and mark as online
            const player = services.playerService.getPlayerById(playerId);
            if (!player) {
                sendErrorEvent('Player not found');
                socket.disconnect();
                return;
            }
            services.playerService.updateStatus(playerId, true);

            socket.join(targets.self);
            socket.join(targets.gameRoom);

            socket.emit('authenticated', { playerId });

            /**
             * Register event handlers
             *
             * To create a new event handler, define the handler function in the appropriate
             * file under `handlers/`, then register it here.
             *
             * The handler must use the `createEventHandler` or `createNoInputEventHandler`
             * utility functions to ensure consistent error handling and input validation.
             *
             * If the event has input, define the input schema using Zod in `packages/socket-events/src/chess.ts`
             * and make sure to update the `ChessGameRoomClientToServerInput` union type accordingly.
             */
            registerMoveHandlers(context);
            registerLifecycleHandlers(context);
            registerChatHandlers(context);
            registerOffersHandlers(context);
            registerDisconnectHandler(context);
        });
    };
}
