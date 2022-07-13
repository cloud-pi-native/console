/* eslint-env node */
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars

const { startDevServer } = require('@cypress/vite-dev-server')
const path = require('path')

module.exports = (on, config) => {
  on('dev-server:start', (options) => {
    return startDevServer({
      options,
      viteConfig: {
        configFile: path.resolve(__dirname, '..', '..', 'vite.config.js'),
      },
    })
  })

  // let's increase the browser window size when running headlessly this will produce higher resolution images and videos
  // https://on.cypress.io/browser-launch-api
  // on('before:browser:launch', (browser = {}, launchOptions) => {
  //   const width = 1600
  //   const height = 2560

  //   console.log(` Setting the ${browser.name} browser window size to ${width} x ${height}`)

  //   if (browser.name === 'chrome' && browser.isHeadless) {
  //     launchOptions.args.push(`--window-size=${width},${height}`)

  //     // force screen to be non-retina and just use our given resolution
  //     launchOptions.args.push('--force-device-scale-factor=1')
  //   }

  //   if (browser.name === 'electron' && browser.isHeadless) {
  //     launchOptions.preferences.width = width
  //     launchOptions.preferences.height = height
  //     launchOptions.preferences.resizable = false
  //   }

  //   if (browser.name === 'firefox' && browser.isHeadless) {
  //     launchOptions.args.push(`--width=${width}`)
  //     launchOptions.args.push(`--height=${height}`)
  //   }

  //   return launchOptions
  // })

  return Object.assign({}, config, {
    mailHogUrl: config.env.mailHogUrl || 'http://localhost:8025',
    fixturesFolder: 'cypress/fixtures',
    integrationFolder: 'cypress/integration',
    screenshotsFolder: 'cypress/screenshots',
    videosFolder: 'cypress/videos',
    supportFile: 'cypress/support/index.js',
  })
}
