module.exports = {
  root: true,
  extends: [
    'standard',
    'plugin:vue/vue3-recommended',
  ],
  plugins: [
    'vue',
    'import',
    'promise',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  env: {
    'vue/setup-compiler-macros': true,
    browser: true,
    es2021: true,
  },
  rules: {
    'comma-dangle': [2, 'always-multiline'],
    'vue/no-v-html': 0,
    'no-irregular-whitespace': 0,
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
