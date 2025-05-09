import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'

// FlatCompat v3 now requires you to opt‐in to the built‐in
// "eslint:recommended" set by name:

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: ['eslint:recommended']
  }
})
export default [
  // 1) Pull in all of your familiar "extends" in flat‐config form
  ...compat.extends(
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
  ),

  // 2) Globally ignore build output, node_modules, etc.
  { ignores: ['node_modules', '.next', 'out', 'dist', 'build'] },

  // 3) Apply parserOptions, plugins, rules, and env to TS/JS files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: path.resolve(__dirname, 'tsconfig.json'),
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
      react: require('eslint-plugin-react'),
      'react-hooks': require('eslint-plugin-react-hooks'),
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
    env: {
      browser: true,
      node: true,
      es2022: true,
    },
    settings: {
      react: { version: 'detect' },
    },
  },
]