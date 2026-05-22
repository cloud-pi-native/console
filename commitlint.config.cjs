module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-leading-blank': [
      2, // error
      'always',
    ],
  },
};
