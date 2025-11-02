import type { ChessGameState } from '@grouchess/chess';
import type { ChessGameMessageType, ChessGameRoom, Message, Player } from '@grouchess/game-room';
import type {
    ChessClientToServerEvents,
    ChessServerToClientEvents,
    ChessInterServerEvents,
    ChessSocketData,
    ChessGameRoomClientToServerInput,
} from '@grouchess/socket-events';
import type { Socket } from 'socket.io';
import * as z from 'zod';

import type { ChessSocketServer } from '../../servers/chess.js';
import { ChessClockService, ChessGameService, GameRoomService, PlayerService } from '../../services/index.js';
import type { TokenService } from '../../services/tokenService.js';

export type ChessGameRoomSocketServices = {
    chessClockService: ChessClockService;
    chessGameService: ChessGameService;
    playerService: PlayerService;
    gameRoomService: GameRoomService;
    tokenService: TokenService;
};
export type ChessGameRoomSocketDependencies = ChessGameRoomSocketServices;

export type BroadcastTargets = 'self' | 'gameRoom';

export type ChessGameSocket = Socket<
    ChessClientToServerEvents,
    ChessServerToClientEvents,
    ChessInterServerEvents,
    ChessSocketData
>;

export type CreateContextArgs = {
    io: ChessSocketServer;
    socket: Socket<ChessClientToServerEvents, ChessServerToClientEvents, ChessInterServerEvents, ChessSocketData>;
    playerId: Player['id'];
    roomId: ChessGameRoom['id'];
    services: ChessGameRoomSocketServices;
};

export type HandlerBaseContext = {
    io: ChessSocketServer;
    socket: Socket<ChessClientToServerEvents, ChessServerToClientEvents, ChessInterServerEvents, ChessSocketData>;
    playerId: Player['id'];
    roomId: ChessGameRoom['id'];
    services: ChessGameRoomSocketServices;
    targets: Record<BroadcastTargets, string>;
};

export type HandlerContext = HandlerBaseContext & {
    sendErrorEvent: (message: string) => void;
    createNewMessage: (messageType: ChessGameMessageType, content?: Message['content']) => void;
    endChessGame: (gameState: ChessGameState, skipSettingGameState?: boolean) => void;
};

export type CreateEventHandlerArgs<I extends ChessGameRoomClientToServerInput = ChessGameRoomClientToServerInput> = {
    eventName: string;
    context: HandlerContext;
    handlerFunction: (input: I, context: HandlerContext) => void;
    inputSchema?: z.ZodType<I>;
    invalidInputMessage?: string;
    failureMessage?: string;
};

export type CreateNoInputEventHandlerArgs = {
    eventName: string;
    context: HandlerContext;
    handlerFunction: (context: HandlerContext) => void;
    failureMessage?: string;
};
