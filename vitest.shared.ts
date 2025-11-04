import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

export const resolvePackageAliases = (packagesDir: string): Record<string, string> => {
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

export const findSourceEntry = (packageDirPath: string): string | null => {
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
