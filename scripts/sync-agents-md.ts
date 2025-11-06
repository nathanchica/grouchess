#!/usr/bin/env tsx

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sync AGENTS.md with CLAUDE.md
 * This ensures AGENTS.md stays in sync with CLAUDE.md automatically via lint-staged
 */
async function main() {
    const repoRoot = path.join(__dirname, '..');
    const sourcePath = path.join(repoRoot, 'CLAUDE.md');
    const targetPath = path.join(repoRoot, 'AGENTS.md');

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
        console.error(`Error: Source file not found at ${sourcePath}`);
        process.exit(1);
    }

    try {
        console.log('Syncing AGENTS.md with CLAUDE.md...');

        // Read source content
        const content = fs.readFileSync(sourcePath, 'utf-8');

        // Write to target
        fs.writeFileSync(targetPath, content, 'utf-8');

        console.log(`✓ Successfully synced ${targetPath}`);
        console.log('\n✅ Sync complete!');
    } catch (error) {
        console.error('Error syncing files:', error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
});
