module.exports = {
  env: {
    jest: true,
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
}
