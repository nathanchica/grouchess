import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { resolvePackageAliases } from '../vitest.shared';

const packagesDir = fileURLToPath(new URL('../packages/', import.meta.url));

export default defineConfig({
    test: {
        environment: 'node',
        pool: 'threads',
        globals: true,
        include: ['**/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.d.ts', 'src/index.ts'],
        },
        setupFiles: ['./vitest.setup.ts'],
    },
    resolve: {
        alias: resolvePackageAliases(packagesDir),
    },
});
