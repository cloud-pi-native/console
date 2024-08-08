import eslintConfigBase from '@cpn-console/eslint-config'
import cypressPlugin from 'eslint-plugin-cypress'
import vuePlugin from 'eslint-plugin-vue'
import eslintAutoImport from './.eslintrc-auto-import.json' assert { type: 'json' }
import stylistic from '@stylistic/eslint-plugin'

export default [
  ...eslintConfigBase,
  ...vuePlugin.configs['flat/recommended'],
  {
    plugins: {
      '@stylistic': stylistic,
      cypress: cypressPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
      },
      globals: {
        ...eslintAutoImport.globals,
        'vue/setup-compiler-macros': true,
        'cypress/globals': true,
        browser: true,
      },
    },
    rules: {
      'vue/no-v-html': 'off',
      'vue/no-irregular-whitespace': 'off',
      'vue/script-indent': ['error', 2],
      '@stylistic/indent': 'off',
      '@stylistic/indent-binary-ops': 'off',
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true }],
      '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/types/',
      '**/coverage/',
      '**/*.d.ts',
      '**/.stylelintrc.cjs',
    ],
  },
]
