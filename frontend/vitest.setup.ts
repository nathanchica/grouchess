import { vi, afterEach, beforeEach } from 'vitest';

import './src/index.css';

beforeEach(() => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:4000/api');
    vi.stubEnv('VITE_WEBSOCKET_URL', 'ws://localhost:4000/api');
    vi.stubEnv('VITE_SENTRY_DSN', 'fake-dsn-for-tests');
    vi.stubEnv('VITE_SENTRY_TRACES_SAMPLE_RATE', '1');
});

afterEach(() => {
    vi.unstubAllEnvs();
});
