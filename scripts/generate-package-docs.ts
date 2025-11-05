#!/usr/bin/env tsx

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ModuleDefinition {
    name: string;
    path: string;
}

interface SchemaInfo {
    name: string;
    module: string;
    enumValues?: string[];
}

/**
 * Checks if a value is a Zod schema by looking for the _def property
 */
function isZodSchema(value: unknown): boolean {
    return (
        typeof value === 'object' &&
        value !== null &&
        '_def' in value &&
        typeof (value as { _def: unknown })._def === 'object'
    );
}

/**
 * Extract all Zod schemas from a module
 */
function extractSchemas(moduleExports: Record<string, unknown>, moduleName: string): SchemaInfo[] {
    const schemas: SchemaInfo[] = [];

    for (const [exportName, exportValue] of Object.entries(moduleExports)) {
        // Skip default exports and non-schemas
        if (exportName === 'default' || !isZodSchema(exportValue)) {
            continue;
        }

        const schemaInfo: SchemaInfo = {
            name: exportName,
            module: moduleName,
        };

        // Check if this is an enum and extract values (Zod 4 structure)
        const def = (exportValue as { _def: Record<string, unknown> })._def;

        // Zod 4 enums: entries is an object like { short: 'short', long: 'long' }
        if (def.type === 'enum' && def.entries && typeof def.entries === 'object') {
            schemaInfo.enumValues = Object.values(def.entries as Record<string, string>);
        }

        schemas.push(schemaInfo);
    }

    return schemas;
}

/**
 * Discover all source modules in a package
 */
function discoverModules(packagePath: string): ModuleDefinition[] {
    const srcDir = path.join(packagePath, 'src');

    if (!fs.existsSync(srcDir)) {
        console.warn(`Warning: src directory not found at ${srcDir}`);
        return [];
    }

    const files = fs.readdirSync(srcDir);
    const modules: ModuleDefinition[] = [];

    for (const file of files) {
        // Skip index.ts, test files, and directories
        if (file === 'index.ts' || /\.(test|spec)\.(ts|js)$/.test(file) || file.includes('__tests__')) {
            continue;
        }

        if (file.endsWith('.ts') || file.endsWith('.js')) {
            const moduleName = file.replace(/\.(ts|js)$/, '');
            modules.push({
                name: moduleName,
                // Use .js extension for imports (since TypeScript compiles to JS)
                path: path.join(srcDir, file.replace(/\.ts$/, '.js')),
            });
        }
    }

    return modules;
}

/**
 * Generate README.md file
 */
function generateReadmeFile(allSchemas: SchemaInfo[], packagePath: string, packageName: string): void {
    const schemasByModule = new Map<string, SchemaInfo[]>();

    for (const schema of allSchemas) {
        if (!schemasByModule.has(schema.module)) {
            schemasByModule.set(schema.module, []);
        }
        schemasByModule.get(schema.module)!.push(schema);
    }

    let readme = `# ${packageName}

> **This documentation is automatically generated. Do not edit manually.**

Zod schemas and TypeScript types for shared data models in the Grouchess chess application.

## Installation

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Available Schemas

`;

    // Group schemas by module
    for (const [moduleName, schemas] of schemasByModule.entries()) {
        readme += `### ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}\n\n`;
        readme += `Located in: \`src/${moduleName}.ts\`\n\n`;

        for (const { name, enumValues } of schemas.sort((a, b) => a.name.localeCompare(b.name))) {
            readme += `- **${name}**\n`;
            if (enumValues && enumValues.length > 0) {
                for (const value of enumValues) {
                    readme += `  - \`"${value}"\`\n`;
                }
            }
        }

        readme += '\n';
    }

    readme += `## Development

### Building

\`\`\`bash
pnpm build
\`\`\`

### Generating Documentation

\`\`\`bash
pnpm docs:generate
\`\`\`

This command automatically updates this README with the list of all available schemas.

**Note:** Documentation is automatically regenerated when schema files are modified and committed (via lint-staged).

`;

    const outputPath = path.join(packagePath, 'README.md');
    fs.writeFileSync(outputPath, readme);
    console.log(`✓ Generated ${outputPath}`);
}

/**
 * Run prettier on generated README
 */
function formatGeneratedFiles(packagePath: string): void {
    const readmePath = path.join(packagePath, 'README.md');

    try {
        execSync(`npx prettier --write "${readmePath}"`, {
            stdio: 'inherit',
        });
        console.log('✓ Formatted README.md');
    } catch (error) {
        console.warn(`Warning: Failed to format README.md:`, error);
    }
}

/**
 * Main function
 */
async function main() {
    const packageArg = process.argv[2];

    if (!packageArg) {
        console.error('Error: Package name required');
        console.error('Usage: tsx scripts/generate-package-docs.ts <package-name>');
        console.error('Example: tsx scripts/generate-package-docs.ts models');
        process.exit(1);
    }

    const repoRoot = path.join(__dirname, '..');
    const packagePath = path.join(repoRoot, 'packages', packageArg);

    if (!fs.existsSync(packagePath)) {
        console.error(`Error: Package not found at ${packagePath}`);
        process.exit(1);
    }

    // Read package.json to get the package name
    const packageJsonPath = path.join(packagePath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
        console.error(`Error: package.json not found at ${packageJsonPath}`);
        process.exit(1);
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const packageName = packageJson.name || `@grouchess/${packageArg}`;

    console.log(`Generating documentation for ${packageName}...\n`);

    // Discover modules
    const modules = discoverModules(packagePath);
    console.log(`Found ${modules.length} source modules\n`);

    const allSchemas: SchemaInfo[] = [];

    // Import and process each module
    for (const { name, path: modulePath } of modules) {
        try {
            const moduleExports = await import(modulePath);
            const schemas = extractSchemas(moduleExports, name);
            allSchemas.push(...schemas);
            console.log(`✓ Processed ${name}: found ${schemas.length} schemas`);
        } catch (error) {
            console.error(`✗ Failed to process ${name}:`, error);
        }
    }

    console.log(`\nTotal schemas found: ${allSchemas.length}\n`);

    if (allSchemas.length === 0) {
        console.warn('Warning: No schemas found. Skipping documentation generation.');
        process.exit(0);
    }

    // Generate README
    generateReadmeFile(allSchemas, packagePath, packageName);

    // Format the generated README
    formatGeneratedFiles(packagePath);

    console.log('\n✅ Documentation generation complete!');
}

main().catch((error) => {
    console.error('Error generating documentation:', error);
    process.exit(1);
});
