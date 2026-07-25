import antfu from '@antfu/eslint-config'

export default antfu(
  {
    stylistic: {
      overrides: {
        'antfu/consistent-chaining': 'off',
        'antfu/if-newline': 'off',
        'antfu/no-top-level-await': 'off',
        'node/prefer-global/process': ['error', 'always'],
        'node/prefer-global/buffer': ['error', 'always'],
        'style/comma-dangle': ['error', 'always-multiline'],
        'style/quote-props': ['error', 'as-needed', { keywords: false, unnecessary: true }],
        'style/brace-style': ['error', '1tbs', { allowSingleLine: true }],
        'style/max-statements-per-line': ['error', { max: 2 }],
        'ts/ban-ts-comment': 'off',
      },
    },
    typescript: true,
    vue: true,
    yaml: {
      overrides: {
        'yaml/quotes': ['error', { prefer: 'double' }],
        'yaml/indent': ['error', 2, { indentBlockSequences: true, indicatorValueIndent: 2 }],
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
    ],
  },
)
