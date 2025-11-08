import { vi, afterEach } from 'vitest';

import './src/index.css';

vi.mock('./src/utils/config', () => ({
    getEnv: vi.fn(() => ({
        VITE_API_BASE_URL: 'http://localhost:4000/api',
        VITE_WEBSOCKET_URL: 'ws://localhost:4000/api',
        VITE_SENTRY_DSN: 'https://fake-dsn-for-tests.sentry.io',
        VITE_SENTRY_TRACES_SAMPLE_RATE: 1,
        MODE: 'test',
        BASE_URL: '/',
        DEV: false,
        PROD: false,
        SSR: false,
        VITE_SERVICE_HEALTH_CHECK_REQUEST_TIMEOUT_MS: 5000,
        VITE_SERVICE_HEALTH_CHECK_MAX_TIMEOUT_ERROR_COUNT: 12,
        VITE_SERVICE_HEALTH_CHECK_MAX_NON_TIMEOUT_ERROR_COUNT: 3,
    })),
}));

afterEach(() => {
    vi.clearAllMocks();
});
