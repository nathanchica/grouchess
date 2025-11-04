import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';

const resolvePackageAliases = (): Record<string, string> => {
    const packagesDirUrl = new URL('../packages/', import.meta.url);
    const packagesDir = fileURLToPath(packagesDirUrl);
    const aliases: Record<string, string> = {};

    for (const entry of readdirSync(packagesDir)) {
        const packageDirPath = path.join(packagesDir, entry);
        if (!statSync(packageDirPath).isDirectory()) continue;

        const packageJsonPath = path.join(packageDirPath, 'package.json');
        if (!existsSync(packageJsonPath)) continue;

        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { name?: string };
        if (!packageJson.name) continue;

        const srcEntry = findSourceEntry(packageDirPath);
        if (!srcEntry) continue;

        aliases[packageJson.name] = srcEntry;
    }

    return aliases;
};

const findSourceEntry = (packageDirPath: string): string | null => {
    const candidates = [
        path.join(packageDirPath, 'src/index.ts'),
        path.join(packageDirPath, 'src/index.tsx'),
        path.join(packageDirPath, 'src/index.js'),
        path.join(packageDirPath, 'src/main.ts'),
        path.join(packageDirPath, 'src/main.tsx'),
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }

    return null;
};

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
            exclude: ['src/main.tsx', 'src/**/*.d.ts'],
        },
        browser: {
            provider: playwright(),
            enabled: true,
            instances: [{ browser: 'chromium' }],
        },
    },
    resolve: {
        alias: resolvePackageAliases(),
    },
});
