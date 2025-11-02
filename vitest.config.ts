import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

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
});
