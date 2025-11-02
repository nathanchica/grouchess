import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const resolvePackageAliases = (): Record<string, string> => {
    const packagesDirUrl = new URL('./packages/', import.meta.url);
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
    root: projectRoot,
    test: {
        environment: 'node',
        pool: 'threads',
        globals: true,
        include: ['**/__tests__/**/*.test.ts', 'backend/**/*.test.ts'],
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
            ],
        },
        setupFiles: ['./backend/vitest.setup.ts'],
    },
    resolve: {
        alias: resolvePackageAliases(),
    },
});
