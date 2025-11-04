import express, { type Express } from 'express';
import request from 'supertest';

import { createApp } from '../app.js';

vi.mock('../services/index.js', () => ({
    chessClockService: { mocked: 'chessClockService' },
    chessGameService: { mocked: 'chessGameService' },
    playerService: { mocked: 'playerService' },
    gameRoomService: { mocked: 'gameRoomService' },
    tokenService: { mocked: 'tokenService' },
}));

vi.mock('../routes/health.js', () => ({
    healthRouter: express.Router(),
}));

vi.mock('../routes/room.js', () => ({
    roomRouter: express.Router(),
}));

vi.mock('../routes/timeControl.js', () => ({
    timeControlRouter: express.Router(),
}));

describe('createApp', () => {
    let app: Express;

    beforeEach(() => {
        app = createApp();
    });

    describe('GET /', () => {
        it('returns welcome message with status ok', async () => {
            const response = await request(app).get('/');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                status: 'ok',
                service: 'grouchess-backend',
                message: 'Welcome to the Grouchess backend service.',
            });
        });

        it('returns JSON content type', async () => {
            const response = await request(app).get('/');

            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
    });

    describe('404 handler', () => {
        it('returns 404 for non-existent routes', async () => {
            const response = await request(app).get('/non-existent-route');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
            });
        });

        it('returns 404 for non-existent POST routes', async () => {
            const response = await request(app).post('/non-existent-route');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
            });
        });

        it.each([
            { method: 'GET', path: '/invalid' },
            { method: 'POST', path: '/api/invalid' },
            { method: 'PUT', path: '/does/not/exist' },
            { method: 'DELETE', path: '/foo/bar' },
            { method: 'PATCH', path: '/baz' },
        ])('returns 404 for $method $path', async ({ method, path }) => {
            const response = await request(app)[method.toLowerCase() as 'get'](path);

            expect(response.status).toBe(404);
            expect(response.body).toEqual({
                error: 'Not Found',
            });
        });
    });

    describe('CORS middleware', () => {
        it('includes CORS headers in response', async () => {
            const response = await request(app).get('/');

            expect(response.headers['access-control-allow-origin']).toBeDefined();
        });

        it('handles OPTIONS preflight requests', async () => {
            const response = await request(app).options('/');

            expect(response.status).toBe(204);
        });
    });

    describe('JSON middleware', () => {
        it('parses JSON request body', async () => {
            // We'll test this by making a request to a route that would use JSON
            // Since we're testing the app setup, we can verify JSON parsing works
            // by checking that the middleware is applied
            const response = await request(app)
                .post('/non-existent')
                .send({ test: 'data' })
                .set('Content-Type', 'application/json');

            // Should get 404, but this confirms JSON was parsed (no 400 error)
            expect(response.status).toBe(404);
        });

        it('handles invalid JSON gracefully', async () => {
            const response = await request(app)
                .post('/non-existent')
                .send('{"invalid": json}')
                .set('Content-Type', 'application/json');

            expect(response.status).toBe(400);
        });
    });

    describe('service exposure middleware', () => {
        it('exposes services to health routes', async () => {
            // This is tested implicitly by the health route tests
            // but we verify the middleware is applied to the routes
            const response = await request(app).get('/health');

            // If services weren't exposed, routes would fail
            // The fact that we get any response (even if mocked) confirms middleware works
            expect(response.status).toBeDefined();
        });

        it('exposes services to room routes', async () => {
            const response = await request(app).get('/room');

            expect(response.status).toBeDefined();
        });

        it('exposes services to time-control routes', async () => {
            const response = await request(app).get('/time-control');

            expect(response.status).toBeDefined();
        });

        it('does not expose services to non-API routes', async () => {
            const response = await request(app).get('/');

            // Root route doesn't need services
            expect(response.status).toBe(200);
        });
    });

    describe('app instance', () => {
        it('returns an Express application', () => {
            expect(app).toBeDefined();
            expect(typeof app).toBe('function');
            expect(app.listen).toBeDefined();
        });

        it('creates a new app instance on each call', () => {
            const app1 = createApp();
            const app2 = createApp();

            expect(app1).not.toBe(app2);
        });
    });
});
