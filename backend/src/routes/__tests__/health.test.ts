import request from 'supertest';

import { createApp } from '../../app.js';

describe('GET /health', () => {
    const fixedInstant = new Date('2024-05-01T09:10:11.123Z');

    beforeEach(() => {
        vi.useFakeTimers({ now: fixedInstant });
        vi.spyOn(process, 'uptime').mockReturnValue(321.456);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('returns the service status payload', async () => {
        const response = await request(createApp()).get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'ok',
            service: 'grouchess-backend',
            uptime: 321.456,
            timestamp: fixedInstant.toISOString(),
        });
    });
});

describe('GET /health/heartbeat', () => {
    const heartbeatInstant = new Date('2024-06-02T12:13:14.567Z');

    beforeEach(() => {
        vi.useFakeTimers({ now: heartbeatInstant });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('returns the heartbeat payload', async () => {
        const response = await request(createApp()).get('/health/heartbeat');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            status: 'alive',
            heartbeat: heartbeatInstant.toISOString(),
        });
    });
});
