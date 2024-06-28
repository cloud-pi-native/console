import eslintConfigBase from '@cpn-console/eslint-config'

export default [
  ...eslintConfigBase,
  {
    "ignores": [
      "types/",
      "**/*.spec.ts",
      "dist/",
      "coverage",
      "node_modules",
      "__mocks__",
      "src/mocks/utils.ts",
      "src/utils/mocks.ts",
      "vite.config.ts",
      "vitest-init.ts",
      "vitest.config.ts"
    ]
  }
]