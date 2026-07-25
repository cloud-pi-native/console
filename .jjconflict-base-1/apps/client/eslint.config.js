import eslintConfigBase from '@cpn-console/eslint-config'

export default eslintConfigBase.overrideRules({
  'e18e/prefer-static-regex': 'off',
  'vue/no-required-prop-with-default': 'off',
})
