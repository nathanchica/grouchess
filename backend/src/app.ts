import cors from 'cors';
import express, { type Express } from 'express';

import { healthRouter } from './routes/health.js';
import { timeControlRouter } from './routes/timeControl.js';

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
    app.use('/health', healthRouter);
    app.use('/time-control', timeControlRouter);

    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
}
