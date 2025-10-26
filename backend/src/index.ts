import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app.js';
import config from './config.js';
import { chessGameService, gameRoomService, playerService } from './services/index.js';
import { createGameRoomSocketHandler } from './sockets/gameRoomSocket.js';

const { PORT, HOST, CLIENT_URL } = config;

const app = createApp();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});

const initializeGameRoomSocket = createGameRoomSocketHandler({
    chessGameService,
    playerService,
    gameRoomService,
});
initializeGameRoomSocket(io);

httpServer.listen(PORT, HOST, () => {
    console.log(`Backend listening on http://${HOST}:${PORT}`);
});
