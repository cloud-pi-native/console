import { defineConfig } from 'cypress'

const clientHost = process.env.CLIENT_HOST || 'localhost'
const clientPort = process.env.CLIENT_PORT || '8080'

export default defineConfig({
  port: 8082,
  e2e: {
    baseUrl: `http://${clientHost}:${clientPort}`,
    fixturesFolder: 'cypress/e2e/fixtures',
    specPattern: 'cypress/e2e/specs/**/*.{cy,e2e}.js',
    supportFile: 'cypress/e2e/support/index.js',
    video: false,
    screenshotsFolder: 'cypress/e2e/screenshots',
    numTestsKeptInMemory: 1,
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: false,
    experimentalWebKitSupport: false,
    experimentalSessionAndOrigin: true,
    env: {
      clientHost,
      clientPort,
    },
  },

  component: {
    specPattern: 'cypress/components/specs/**/*.{cy,ct}.js',
    supportFile: 'cypress/components/support/index.js',
    indexHtmlFile: 'cypress/components/support/component-index.html',
    video: false,
    screenshotsFolder: 'cypress/components/screenshots',
    numTestsKeptInMemory: 1,
    devServer: {
      framework: 'vue',
      bundler: 'vite',
    },
  },
})
