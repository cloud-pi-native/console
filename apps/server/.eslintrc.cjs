module.exports = {
  root: false,
  extends: [
    'standard',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  rules: {
    'comma-dangle': [2, 'always-multiline'],
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  plugins: [
    'n',
    'import',
    'promise',
    '@typescript-eslint/eslint-plugin',
  ],
  overrides: [
    {
      files: ['**/src/**/*.spec.{j,t}s?(x)'],
      env: {
        jest: true,
      },
    },
  ],
}
