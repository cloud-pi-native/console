module.exports = {
  extends: [
    'standard',
  ],
  plugins: [
    'n',
    'import',
    'promise',
    'cypress',
  ],
  env: {
    'cypress/globals': true,
    browser: true,
    es2021: true,
  },
  rules: {
    'comma-dangle': [2, 'always-multiline'],
  },
}
