#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packagesDir = path.join(rootDir, 'packages');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

function question(query) {
    return new Promise((resolve) => rl.question(query, resolve));
}

function validatePackageName(name) {
    if (!name || name.trim().length === 0) {
        return 'Package name cannot be empty';
    }
    if (name.length > 100) {
        return 'Package name must be 100 characters or less';
    }
    if (!/^[a-z0-9-]+$/.test(name)) {
        return 'Package name must contain only lowercase letters, numbers, and hyphens';
    }
    if (fs.existsSync(path.join(packagesDir, name))) {
        return `Package "${name}" already exists`;
    }
    return null;
}

async function main() {
    console.log('📦 Scaffolding new TypeScript package...\n');

    let packageName;
    let error;

    do {
        packageName = await question('Package name (lowercase, hyphens allowed, max 100 chars): ');
        packageName = packageName.trim();
        error = validatePackageName(packageName);
        if (error) {
            console.log(`❌ ${error}\n`);
        }
    } while (error);

    const packageDescription = await question('Package description (optional): ');

    const packageDir = path.join(packagesDir, packageName);
    const srcDir = path.join(packageDir, 'src');

    console.log(`\n✨ Creating package: @grouchess/${packageName}\n`);

    // Create directories
    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(srcDir, { recursive: true });

    // Create package.json
    const packageJson = {
        name: `@grouchess/${packageName}`,
        version: '1.0.0',
        description: packageDescription.trim() || `${packageName} package`,
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        exports: {
            '.': {
                types: './dist/index.d.ts',
                default: './dist/index.js',
            },
        },
        scripts: {
            build: 'tsc -p tsconfig.build.json',
            typecheck: 'tsc --noEmit',
            test: 'vitest run --coverage',
            'test:run': 'vitest run',
        },
        keywords: [packageName],
        author: '',
        license: 'ISC',
        devDependencies: {
            typescript: '^5.9.3',
            vitest: '^4.0.6',
        },
    };

    fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

    // Create tsconfig.json
    const tsConfig = {
        compilerOptions: {
            target: 'ES2023',
            module: 'node16',
            lib: ['ES2023'],
            moduleResolution: 'node16',
            rootDir: './src',
            outDir: './dist',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            resolveJsonModule: true,
            allowSyntheticDefaultImports: true,
            declaration: true,
            declarationMap: true,
            sourceMap: true,
            noUnusedLocals: true,
            noUnusedParameters: true,
            noImplicitReturns: true,
            noFallthroughCasesInSwitch: true,
        },
        include: ['src/**/*', '../../vitest.env.d.ts'],
        exclude: ['node_modules', 'dist'],
    };

    fs.writeFileSync(path.join(packageDir, 'tsconfig.json'), JSON.stringify(tsConfig, null, 4) + '\n');

    // Create tsconfig.build.json
    const tsConfigBuild = {
        extends: './tsconfig.json',
        exclude: ['src/**/__tests__/**/*', '../../vitest.env.d.ts'],
    };

    fs.writeFileSync(path.join(packageDir, 'tsconfig.build.json'), JSON.stringify(tsConfigBuild, null, 4) + '\n');

    // Create empty index.ts
    fs.writeFileSync(path.join(srcDir, 'index.ts'), '');

    console.log(`✅ Created: ${packageDir}/`);
    console.log(`✅ Created: ${srcDir}/`);
    console.log(`✅ Created: ${packageDir}/package.json`);
    console.log(`✅ Created: ${packageDir}/tsconfig.json`);
    console.log(`✅ Created: ${packageDir}/tsconfig.build.json`);
    console.log(`✅ Created: ${srcDir}/index.ts`);

    console.log(`\n🎉 Package scaffolded successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  1. cd packages/${packageName}`);
    console.log(`  2. pnpm install`);
    console.log(`  3. Start coding in src/index.ts`);
    console.log(`\nThe package will be built with: pnpm build:packages\n`);

    rl.close();
}

main().catch((error) => {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
});
