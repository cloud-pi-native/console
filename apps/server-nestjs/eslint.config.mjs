import eslintConfigBase from '@cpn-console/eslint-config'
import nestjsTyped from '@darraghor/eslint-plugin-nestjs-typed'

export default eslintConfigBase.append({
  plugins: {
    '@darraghor/nestjs-typed': nestjsTyped,
  },
  rules: {
    '@darraghor/nestjs-typed/sort-module-metadata-arrays': 'error',
  },
}).append(nestjsTyped.configs.flatNoSwagger)
