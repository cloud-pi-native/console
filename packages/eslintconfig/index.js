import tseslint from 'typescript-eslint'
import js from "@eslint/js"
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
        project: true,
        sourceType: 'module',
      },
    },
    files: [
      '**/*.{js,cjs,mjs,ts}',
    ],
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          "vars": "all",
          "varsIgnorePattern": "^_",
          "args": "after-used",
          "argsIgnorePattern": "^_",
        },
      ],
    },
    ignores: [
      '**/coverage',
      '**/eslint.config.js',
      '**/packages/eslint-config/src/index.js'
    ],
  },
)