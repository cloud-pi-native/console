import antfu from '@antfu/eslint-config';

export default antfu({
  stylistic: {
    overrides: {
      // Disable ALL formatting rules - oxfmt handles these
      'style/semi': 'off',
      'style/no-trailing-spaces': 'off',
      'style/arrow-parens': 'off',
      'style/brace-style': 'off',
      'style/comma-dangle': 'off',
      'style/quote-props': 'off',
      'style/max-statements-per-line': 'off',
      'style/quotes': 'off',
      'style/member-delimiter-style': 'off',
      'style/operator-linebreak': 'off',
      'antfu/consistent-chaining': 'off',
      'antfu/if-newline': 'off',
      'antfu/no-top-level-await': 'off',
      'perfectionist/sort-imports': 'off',
      // JSON formatting
      'jsonc/comma-dangle': 'off',
      'jsonc/sort-keys': 'off',
      // Keep lint rules (not formatting)
      'node/prefer-global/process': ['error', 'always'],
      'node/prefer-global/buffer': ['error', 'always'],
      'ts/ban-ts-comment': 'off',
    },
  },
  typescript: true,
  vue: true,
  yaml: {
    overrides: {
      'yaml/quotes': 'off',
      'yaml/indent': 'off',
    },
  },
  markdown: {
    overrides: {
      'markdown/require-alt-text': 'off',
    },
  },
  ignores: [
    '**/node_modules',
    '**/prisma/migrations',
    '**/pnpm-lock.yaml',
    '**/dist/',
    '**/types/',
    '**/coverage/',
    '**/templates/*.{yaml,yml}',
    '**/Chart.yaml',
    '**/*.d.ts',
    '**/*.md/*.js',
    '**/*.md/*.ts',
    'README.md',
    'pnpm-workspace.yaml',
  ],
});
