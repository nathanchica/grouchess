import { Router } from 'express';

export const healthRouter: Router = Router();

healthRouter.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'grouchess-backend',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

healthRouter.get('/heartbeat', (_req, res) => {
    res.json({
        status: 'alive',
        heartbeat: new Date().toISOString(),
    });
});
