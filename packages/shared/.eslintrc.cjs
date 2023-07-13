module.exports = {
  env: {
    node: true,
  },
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  plugins: [
    'n',
    'import',
    'promise',
    '@typescript-eslint/eslint-plugin',
  ],
  rules: {
    'comma-dangle': [2, 'always-multiline'],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      files: ['**/src/**/*.spec.{j,t}s?(x)'],
      env: {
        jest: true,
      },
    },
  ],
}
