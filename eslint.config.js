import js from '@eslint/js'
import importX from 'eslint-plugin-import-x'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importX,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'import-x/order': ['warn', {
        groups: [
          'builtin',
          'external',
          'internal',
          ['parent', 'sibling', 'index'],
        ],
        pathGroupsExcludedImportTypes: [],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],
    },
  },
])
