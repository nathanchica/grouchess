import { SUPPORTED_TIME_CONTROLS } from '@grouchess/game-room';
import { GetTimeControlOptionsResponseSchema } from '@grouchess/http-schemas';
import { Router } from 'express';

export const timeControlRouter: Router = Router();

timeControlRouter.get('/', (_req, res) => {
    try {
        res.json(
            GetTimeControlOptionsResponseSchema.parse({
                supportedTimeControls: SUPPORTED_TIME_CONTROLS,
            })
        );
    } catch (error) {
        console.error('Error getting time control options:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
