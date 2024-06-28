import eslintConfigBase from "@cpn-console/eslint-config"
import cypressPlugin from "eslint-plugin-cypress"
import vuePlugin from "eslint-plugin-vue"

export default [
  ...eslintConfigBase,
  {
    ignores: [
      "dist/",
      "**/*.spec.ts"
    ],
    "plugins": {
      "vue": vuePlugin,
      "cypress": cypressPlugin
    },
    "languageOptions": {
      "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
      },
      "globals": {
        "vue/setup-compiler-macros": true,
        "cypress/globals": true,
        "browser": true,
        "es2023": true
      }
    },
    "rules": {
      "vue/no-v-html": 0,
      "no-irregular-whitespace": 0
    }
  }
]