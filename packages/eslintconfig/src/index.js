import tseslint from 'typescript-eslint'
import js from '@eslint/js'
import { fixupPluginRules } from '@eslint/compat'
import nodePlugin from 'eslint-plugin-n'
import importPlugin from 'eslint-plugin-unused-imports'
import promisePlugin from 'eslint-plugin-promise'
import stylistic from '@stylistic/eslint-plugin'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.recommendedTypeChecked,
  {
    plugins: {
      '@stylistic': stylistic,
      '@typescript-eslint': tseslint.plugin,
      'node': nodePlugin,
      'promise': fixupPluginRules(promisePlugin),
      'unused-imports': fixupPluginRules(importPlugin),
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: '**/tsconfig.eslint.json',
        sourceType: 'module',
      },
    },
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/arrow-spacing': ['error', { 'before': true, 'after': true }],
      '@stylistic/eol-last': ['error', 'always'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          'vars': 'all',
          'varsIgnorePattern': '^_',
          'args': 'after-used',
          'argsIgnorePattern': '^_',
        },
      ],
    },
    files: [
      '**/*.{js,cjs,mjs,ts}',
    ],
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/types/',
      '**/coverage/',
      '**/*.d.ts',
    ],
  },
)
