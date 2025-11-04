import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { resolvePackageAliases } from './vitest.shared';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));
const packagesDir = fileURLToPath(new URL('./packages/', import.meta.url));

export default defineConfig({
    root: projectRoot,
    test: {
        environment: 'node',
        pool: 'threads',
        globals: true,
        include: ['**/__tests__/**/*.test.ts', 'backend/**/*.test.ts'],
        exclude: ['frontend/**', '**/node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'packages/chess/src/index.ts',
                'packages/chess-clocks/src/index.ts',
                'packages/errors/src/index.ts',
                'packages/game-room/src/index.ts',
                'packages/http-schemas/src/index.ts',
                'packages/models/src/index.ts',
                'packages/test-utils/src/index.ts',
            ],
        },
        setupFiles: ['./backend/vitest.setup.ts'],
    },
    resolve: {
        alias: resolvePackageAliases(packagesDir),
    },
});
