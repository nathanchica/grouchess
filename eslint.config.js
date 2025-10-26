import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettierConfig,

    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            '**/build/**',
            '**/*.min.js',
            'eslint.config.js',
            '**/*.config.js',
            '**/*.config.ts',
            '**/vite.config.ts',
            '.husky/**',
        ],
    },

    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
            },
            globals: {
                console: 'readonly',
                process: 'readonly',
                document: 'readonly',
                navigator: 'readonly',
                window: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Audio: 'readonly',
                Image: 'readonly',
                HTMLAudioElement: 'readonly',
                HTMLButtonElement: 'readonly',
                HTMLDivElement: 'readonly',
                HTMLFormElement: 'readonly',
                HTMLImageElement: 'readonly',
                HTMLInputElement: 'readonly',
                fetch: 'readonly',
                URL: 'readonly',
                DOMRect: 'readonly',
                KeyboardEvent: 'readonly',
                sessionStorage: 'readonly',
                localStorage: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
            import: importPlugin,
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
            'import/no-unused-modules': 'off',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
        settings: {
            react: { version: '^19.2.0' },
        },
    },
    {
        files: ['backend/**/*.ts'],
        rules: {
            'no-console': 'off',
        },
    },
];
