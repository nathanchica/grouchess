#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function question(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
}

async function main(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    try {
        console.log('Scaffolding tests...\n');

        const fileAnswer = (
            await question(
                rl,
                'Source file (relative to repo root, e.g. frontend/src/providers/StoredSettingsProvider.tsx): '
            )
        ).trim();

        if (!fileAnswer) {
            console.error('No source file provided.');
            rl.close();
            process.exit(1);
        }

        const srcPath = path.resolve(rootDir, fileAnswer);
        if (!fs.existsSync(srcPath)) {
            console.error(`Source file not found: ${path.relative(rootDir, srcPath)}`);
            rl.close();
            process.exit(1);
        }

        const providerAnswer = (await question(rl, 'Which tool do you want to use? (claude/c, codex/x) [codex]: '))
            .trim()
            .toLowerCase();

        let provider: 'claude' | 'codex' = 'codex';
        if (providerAnswer === 'claude' || providerAnswer === 'c') {
            provider = 'claude';
        } else if (providerAnswer === 'codex' || providerAnswer === 'x' || providerAnswer === '') {
            provider = 'codex';
        } else {
            console.error('Invalid choice. Please choose "claude" or "codex".');
            rl.close();
            process.exit(1);
        }

        rl.close();

        const relPath = path.relative(rootDir, srcPath).replace(/\\/g, '/');

        const query = `Scaffold a Vitest test file for "${relPath}" create test cases, but do not implement them.`;

        let cmd: string;
        let args: string[];

        if (provider === 'claude') {
            cmd = 'claude';
            args = ['-p', query, '--model', 'sonnet'];
        } else {
            cmd = 'codex';
            args = ['exec', '--full-auto', query, '--model', 'gpt-5.1'];
        }

        console.log(`\n▶ Running: ${cmd} ${args.join(' ')}\n`);

        const child = spawn(cmd, args, {
            cwd: rootDir,
            stdio: 'inherit',
        });

        child.on('exit', (code: number | null) => {
            if (code && code !== 0) {
                console.error(`\n${cmd} exited with code ${code}`);
                process.exit(code);
            }
        });
    } catch (error: unknown) {
        rl.close();
        const message = error instanceof Error ? error.message : String(error);
        console.error('Error scaffolding tests:', message);
        process.exit(1);
    }
}

void main();
