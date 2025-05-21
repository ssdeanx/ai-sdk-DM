// @ts-check
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';
import tseslint from 'typescript-eslint';
import eslintPluginReact from 'eslint-plugin-react';
import eslintPluginReactHooks from 'eslint-plugin-react-hooks';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'; // <-- Import Prettier recommended config

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: ['eslint:recommended'],
  },
});

export default [
  // Include typescript-eslint recommended config
  ...tseslint.configs.recommended,

  // 1) Pull in all of your familiar "extends" in flat‐config form
  ...compat.extends('plugin:react/recommended'),

  // 2) Globally ignore build output, node_modules, etc.
  {
    ignores: [
      'node_modules',
      '.next',
      'out',
      'dist',
      'build',
      'llm.json',
      'docs',
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      '*.md',
      '.dependency-cruiser.js',
    ],
  },

  // 3) Apply parserOptions, plugins, rules, and env to TS/JS files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: path.resolve(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
      globals: {
        React: 'readonly',
      },
    },
    plugins: {
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      // 'prettier' plugin is included via eslintPluginPrettierRecommended
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': 'warn',
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js with React 18+
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      // 'prettier/prettier': 'error' is included via eslintPluginPrettierRecommended
    },
    settings: {
      react: { version: 'detect' },
    },
  },
  // Add Prettier recommended configuration
  // This should generally be the last configuration in the array
  // to ensure it can override other formatting rules.
  eslintPluginPrettierRecommended, // <-- Add Prettier config here
];
