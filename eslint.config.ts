// @ts-check
import { FlatCompat } from '@eslint/eslintrc'
import path from 'path'
import { fileURLToPath } from 'url'
import tseslint from 'typescript-eslint'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: ['eslint:recommended'],
  }
})

export default [
  // Include typescript-eslint recommended config
  ...tseslint.configs.recommended,

  // 1) Pull in all of your familiar "extends" in flat‐config form
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ),

  // 2) Globally ignore build output, node_modules, etc.
  { ignores: ['node_modules', '.next', 'out', 'dist', 'build', 'llm.json', 'docs', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '*.md'] },

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
      'react': eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'react/react-in-jsx-scope': 'off', // Not needed in Next.js with React 18+
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
    settings: {
      react: { version: 'detect' },
    },
  },
]