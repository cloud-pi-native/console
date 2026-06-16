import eslintConfigBase from '@cpn-console/eslint-config';

export default eslintConfigBase.append({
  ignores: [
    'apps/',
    'packages/',
    'plugins/',
    'docker/',
    'keycloak/',
    'migrations/',
    'ci/',
    'scripts/',
    'docs/',
    'misc/',
    '.vscode/',
    'playwright/',
    '*.json',
    '*.jsonc',
  ],
});
