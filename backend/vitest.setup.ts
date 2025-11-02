import { vi, afterAll } from 'vitest';

vi.stubEnv('JWT_SECRET', process.env.JWT_SECRET ?? 'test-secret');
vi.stubEnv('CLIENT_URL', process.env.CLIENT_URL ?? 'http://localhost:3000');

afterAll(() => {
    vi.unstubAllEnvs();
});
