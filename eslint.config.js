import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const ENGINE = ['three', 'three/*', '@react-three/*', 'react', 'react-dom']
const ABOVE_CORE = ['@systems/*', '@entities/*', '@scenes/*', '@render/*', '@ui/*', '@platform/*']
const LIMIT = { max: 300, skipBlankLines: true, skipComments: true }

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'release',
    'public',
    'raw',
    'coverage',
    'playwright-report',
    'test-results',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  // THE ARCHITECTURE: core and data never touch the engine or upward layers.
  {
    files: ['src/core/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [...ENGINE, ...ABOVE_CORE],
              message: 'src/core is engine-free: no three, no React, no upward layer imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['**'], message: 'src/data is pure data: zero imports.' }] },
      ],
    },
  },
  // Project limits: named exports only, files ≤ 300 lines (code, not data), functions ≤ 50.
  {
    files: ['src/**', 'tests/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'ExportDefaultDeclaration', message: 'Named exports only.' },
      ],
    },
  },
  {
    files: ['src/**', 'tests/**'],
    ignores: ['src/data/**'],
    rules: { 'max-lines': ['error', LIMIT] },
  },
  {
    files: ['src/**'],
    rules: { 'max-lines-per-function': ['error', { ...LIMIT, max: 50 }] },
  },
])
