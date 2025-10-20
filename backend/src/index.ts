import { createServer } from 'node:http';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app.js';
import config from './config.js';

const { PORT, HOST, CLIENT_URL } = config;

const app = createApp();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: CLIENT_URL,
    },
});

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('heartbeat', () => {
        socket.emit('heartbeat', { timestamp: new Date().toISOString() });
    });

    socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id}`);
    });
});

httpServer.listen(PORT, HOST, () => {
    console.log(`Backend listening on http://${HOST}:${PORT}`);
});
