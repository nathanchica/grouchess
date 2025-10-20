import { createServer } from 'node:http';
import process from 'node:process';

import { Server as SocketIOServer } from 'socket.io';

import { createApp } from './app.js';

const PORT = Number.parseInt(process.env.PORT ?? '4000', 10);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = createApp();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: process.env.CLIENT_ORIGIN ?? '*',
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
