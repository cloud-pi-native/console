module.exports = {
  env: {
    node: true,
  },
  extends: [
    'standard',
  ],
  plugins: [
    'n',
    'import',
    'promise',
  ],
  rules: {
    'comma-dangle': [2, 'always-multiline'],
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
