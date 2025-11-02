import { vi, afterAll } from 'vitest';

vi.stubEnv('JWT_SECRET', 'test-secret-you-should-change-this-in-tests');
vi.stubEnv('CLIENT_URL', 'http://localhost:3000');

afterAll(() => {
    vi.unstubAllEnvs();
});
