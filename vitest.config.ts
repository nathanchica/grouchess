import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
    root: projectRoot,
    test: {
        environment: 'node',
        pool: 'threads',
        globals: true,
        include: ['**/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
        },
    },
    resolve: {
        alias: {
            '@grouchess/chess': fromRoot('./packages/chess/src/index.ts'),
            '@grouchess/errors': fromRoot('./packages/errors/src/index.ts'),
            '@grouchess/game-room': fromRoot('./packages/game-room/src/index.ts'),
        },
    },
});
