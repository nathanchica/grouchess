import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

import { resolvePackageAliases } from '../vitest.shared';

const packagesDir = fileURLToPath(new URL('../packages/', import.meta.url));

export default defineConfig({
    plugins: [react(), tailwindcss(), svgr()],
    optimizeDeps: {
        include: [
            'react',
            'react-dom',
            'react-dom/client',
            '@sentry/react',
            'react-error-boundary',
            'react-router',
            'socket.io-client',
        ],
    },
    test: {
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/__tests__/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/**/types.ts'],
        },
        browser: {
            provider: playwright(),
            enabled: true,
            instances: [{ browser: 'chromium' }],
            screenshotFailures: false,
        },
    },
    resolve: {
        alias: resolvePackageAliases(packagesDir),
    },
});
