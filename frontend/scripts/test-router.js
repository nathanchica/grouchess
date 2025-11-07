#!/usr/bin/env node

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Parse arguments: first arg is whether to include coverage
const args = process.argv.slice(2);
const withCoverage = args[0] === '--coverage';
const testPattern = withCoverage ? args.slice(1).join(' ') : args.join(' ');

/**
 * Execute a command and return whether it succeeded
 */
function executeCommand(command, args) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {
            cwd: rootDir,
            stdio: 'inherit',
            shell: true,
        });

        child.on('close', (code) => {
            resolve(code === 0);
        });

        child.on('error', (error) => {
            console.error(`Error executing command ${command} ${args.join(' ')}:`, error);
            resolve(false);
        });
    });
}

/**
 * Check if a pattern matches tests in a specific project
 */
async function hasMatchingTests(project, pattern) {
    return new Promise((resolve) => {
        const args = ['vitest', 'list', '--project', project];
        if (pattern) {
            args.push(pattern);
        }

        const child = spawn('pnpm', args, {
            cwd: rootDir,
            stdio: 'pipe',
            shell: true,
        });

        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        child.stderr.on('data', (data) => {
            console.error(`Error checking tests for project ${project}:`, data.toString());
        });

        child.on('close', () => {
            // vitest list outputs test file paths if there are matches
            // Check if there are any test files listed (lines that don't start with whitespace/special chars)
            const hasTests = output
                .split('\n')
                .some(
                    (line) =>
                        line.trim().length > 0 &&
                        !line.startsWith(' ') &&
                        !line.includes('Test Files') &&
                        line.includes('.test.')
                );
            resolve(hasTests);
        });

        child.on('error', (error) => {
            console.error(`Error checking tests for project ${project}:`, error);
            resolve(false);
        });
    });
}

async function main() {
    if (!testPattern) {
        console.log('Running all tests...');
        const utilsResult = await executeCommand('pnpm', ['test:utils:run']); // No coverage for utils
        const browserResult = await executeCommand('pnpm', ['test:browser']);
        const result = utilsResult && browserResult;
        process.exit(result ? 0 : 1);
    }

    console.log('🔍 Analyzing test pattern:', testPattern || '(all tests)');

    // Check which projects have matching tests
    const [hasUtilsTests, hasBrowserTests] = await Promise.all([
        hasMatchingTests('happy-dom', testPattern),
        hasMatchingTests('browser', testPattern),
    ]);

    console.log('📊 Test discovery:');
    console.log(`  - Utils tests (happy-dom): ${hasUtilsTests ? '✓ found' : '✗ none'}`);
    console.log(`  - Browser tests: ${hasBrowserTests ? '✓ found' : '✗ none'}`);
    console.log();

    let allPassed;

    // Determine which test suites to run
    if (!hasUtilsTests && !hasBrowserTests && testPattern) {
        // Pattern provided but no matches - exit without running tests
        console.log('❌ No matching tests found for pattern:', testPattern);
        process.exit(1);
    } else if (hasUtilsTests && !hasBrowserTests) {
        console.log('🎯 Running utils tests only');
        const utilsArgs = withCoverage ? ['test:utils'] : ['test:utils:run'];
        if (testPattern) {
            utilsArgs.push(testPattern);
        }
        allPassed = await executeCommand('pnpm', utilsArgs);
    } else if (!hasUtilsTests && hasBrowserTests) {
        console.log('🎯 Running browser tests only');
        const browserArgs = withCoverage ? ['test:browser'] : ['test:browser:run'];
        if (testPattern) {
            browserArgs.push(testPattern);
        }
        allPassed = await executeCommand('pnpm', browserArgs);
    } else {
        // Both have matches - run both but generate coverage only after browser tests
        console.log('🎯 Running both test suites');

        const utilsArgs = ['test:utils:run']; // Always without coverage
        const browserArgs = withCoverage ? ['test:browser'] : ['test:browser:run'];

        if (testPattern) {
            utilsArgs.push(testPattern);
            browserArgs.push(testPattern);
        }

        const utilsResult = await executeCommand('pnpm', utilsArgs);
        const browserResult = await executeCommand('pnpm', browserArgs);
        allPassed = utilsResult && browserResult;
    }

    process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
    console.error('Error running tests:', error);
    process.exit(1);
});
