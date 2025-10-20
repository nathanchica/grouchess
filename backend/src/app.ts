import express, { type Express } from 'express';

import { healthRouter } from './routes/health.js';

export function createApp(): Express {
    const app = express();

    app.use(express.json());
    app.get('/', (_req, res) => {
        res.json({
            status: 'ok',
            service: 'grouchess-backend',
            message: 'Welcome to the Grouchess backend service.',
        });
    });
    app.use('/health', healthRouter);

    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    return app;
}
