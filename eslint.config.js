import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import vitestPlugin from '@vitest/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

const vitestGlobals = vitestPlugin.environments.env.globals;

export default [
    js.configs.recommended,
    prettierConfig,

    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            'coverage/**',
            '**/*.min.js',
            'eslint.config.js',
            '**/*.config.js',
            '**/*.config.ts',
            '**/vite.config.ts',
            '.husky/**',
        ],
    },

    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                WindowEventMap: 'readonly',
                AddEventListenerOptions: 'readonly',
                EventListenerOptions: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            import: importPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            vitest: vitestPlugin,
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unknown-property': [
                'error',
                {
                    ignore: [
                        'onPointerDown',
                        'onPointerUp',
                        'onPointerMove',
                        'onPointerCancel',
                        'onPointerEnter',
                        'onPointerLeave',
                        'onPointerOver',
                        'onPointerOut',
                    ],
                },
            ],
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'import/order': [
                'warn',
                {
                    groups: ['builtin', 'external', 'internal', 'sibling', 'parent', 'index'],
                    'newlines-between': 'always',
                    alphabetize: {
                        order: 'asc',
                        caseInsensitive: false,
                    },
                    pathGroups: [
                        {
                            pattern: 'react',
                            group: 'external',
                            position: 'before',
                        },
                        {
                            pattern: 'react-dom/**',
                            group: 'external',
                            position: 'before',
                        },
                    ],
                    pathGroupsExcludedImportTypes: ['react'],
                },
            ],
            'import/no-duplicates': 'error',
            'import/no-unused-modules': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
        settings: {
            react: { version: '^19.2.0' },
        },
    },
    {
        files: ['**/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx}'],
        languageOptions: {
            globals: {
                ...vitestGlobals,
            },
        },
        rules: {
            ...vitestPlugin.configs.recommended.rules,
        },
    },
    {
        files: ['backend/**/*.ts', '**/scripts/**/*.{js,ts}'],
        rules: {
            'no-console': 'off',
        },
    },
];
