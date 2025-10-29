import { createServer } from 'node:http';

import { createApp } from './app.js';
import config from './config.js';
import { chessIO } from './servers/chess.js';
import { chessClockService, chessGameService, gameRoomService, playerService } from './services/index.js';
import { createChessGameRoomSocketHandler } from './sockets/chessGameRoomSocket.js';

const { PORT, HOST, CLIENT_URL } = config;

const app = createApp();
const httpServer = createServer(app);
chessIO.attach(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
    },
});

const initializeChessGameRoomSocket = createChessGameRoomSocketHandler({
    chessClockService,
    chessGameService,
    playerService,
    gameRoomService,
});
initializeChessGameRoomSocket(chessIO);

httpServer.listen(PORT, HOST, () => {
    console.log(`Backend listening on http://${HOST}:${PORT}`);
});
