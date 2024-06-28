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
      'cypress': cypressPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: '@typescript-eslint/parser',
      },
      'globals': {
        ...eslintAutoImport.globals,
        'vue/setup-compiler-macros': true,
        'cypress/globals': true,
        browser: true,
      },
    },
    rules: {
      'vue/no-v-html': 0,
      'vue/no-irregular-whitespace': 0,
      'vue/script-indent': ['error', 2],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/semi': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', 'always'],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/arrow-spacing': ['error', { 'before': true, 'after': true }],
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
