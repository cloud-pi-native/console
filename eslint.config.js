import eslintConfigBase from '@cpn-console/eslint-config'

export default eslintConfigBase.append({
  ignores: [
    'apps/',
    'packages/',
    'plugins/',
  ],
})
