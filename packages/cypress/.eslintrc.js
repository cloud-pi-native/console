module.exports = {
  root: true,
  extends: [
    'standard',
  ],
  plugins: [
    'cypress',
    'import',
    'promise',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  env: {
    'cypress/globals': true,
    browser: true,
    es2021: true,
  },
  rules: {
    'comma-dangle': [2, 'always-multiline'],
    'vue/no-v-html': 0,
    'no-irregular-whitespace': 0,
  },
}
