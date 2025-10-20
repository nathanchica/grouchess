import { Router } from 'express';

import { SUPPORTED_TIME_CONTROLS } from '../data/timeControl.js';

export const timeControlRouter: Router = Router();

timeControlRouter.get('/', (_req, res) => {
    res.json({
        supportedTimeControls: SUPPORTED_TIME_CONTROLS,
    });
});
