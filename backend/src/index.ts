import { createServer } from 'node:http';

import { createApp } from './app.js';
import config from './config.js';
import { chessIO } from './servers/chess.js';
import { chessClockService, chessGameService, gameRoomService, playerService } from './services/index.js';
import { createGameRoomSocketHandler } from './sockets/gameRoomSocket.js';

const { PORT, HOST, CLIENT_URL } = config;

const app = createApp();
const httpServer = createServer(app);
chessIO.attach(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});

const initializeGameRoomSocket = createGameRoomSocketHandler({
    chessClockService,
    chessGameService,
    playerService,
    gameRoomService,
});
initializeGameRoomSocket(chessIO);

httpServer.listen(PORT, HOST, () => {
    console.log(`Backend listening on http://${HOST}:${PORT}`);
});
