/**
 * @type {Cypress.PluginConfig}
 */

module.exports = (on, config) => {
  return Object.assign({}, config, {
    baseUrl: 'http://dso-client:80',
    testFiles: '**/*.{cy,e2e}.js',
    pluginsFile: 'plugins/index.js',
    supportFile: 'support/index.js',
    integrationFolder: 'specs',
    video: false,
    component: {
      componentFolder: 'src',
      testFiles: '**/*.{ct,cy,e2e}.{js,ts,jsx,tsx}',
      viewportHeight: 500,
      viewportWidth: 1000,
    },
  })
}
