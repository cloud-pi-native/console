module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: [
    "standard",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module"
  },
  rules: {
    "comma-dangle": [2, "always-multiline"],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    "@typescript-eslint/no-explicit-any": "off",
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  plugins: [
    "@typescript-eslint",
    "n",
    "import",
    "promise"
  ],
  overrides: [
    {
      files: ["**/src/**/*.spec.{j,t}s?(x)"],
      env: {
        jest: true
      }
    }
  ]
}
