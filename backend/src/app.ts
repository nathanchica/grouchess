import cors from 'cors';
import express, { type Express, type Request, type Response, type NextFunction } from 'express';

import { healthRouter } from './routes/health.js';
import { roomRouter } from './routes/room.js';
import { timeControlRouter } from './routes/timeControl.js';
import { GameRoomService } from './services/gameRoomService.js';
import { PlayerService } from './services/playerService.js';

const services = {
    playerService: new PlayerService(),
    gameRoomService: new GameRoomService(),
};

const exposeServices = (req: Request, _res: Response, next: NextFunction) => {
    req.services = services;
    next();
};

export function createApp(): Express {
    const app = express();
    app.use(cors());

    app.use(express.json());
    app.get('/', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'grouchess-backend',
            message: 'Welcome to the Grouchess backend service.',
        });
    });
    app.use('/health', exposeServices, healthRouter);
    app.use('/room', exposeServices, roomRouter);
    app.use('/time-control', exposeServices, timeControlRouter);

    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
}
