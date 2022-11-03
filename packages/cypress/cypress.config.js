import { defineConfig } from 'cypress'

const clientHost = process.env.CLIENT_HOST || 'localhost'
const clientPort = process.env.CLIENT_PORT || '8080'

export default defineConfig({
  e2e: {
    baseUrl: `http://${clientHost}:${clientPort}`,
    fixturesFolder: 'e2e/fixtures',
    specPattern: 'e2e/specs/**/*.{cy,e2e}.js',
    supportFile: 'e2e/support/index.js',
    video: false,
    screenshotsFolder: 'e2e/screenshots',
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
    specPattern: 'components/specs/**/*.{cy,ct}.js',
    supportFile: 'components/support/index.js',
    indexHtmlFile: 'components/support/component-index.html',
    video: false,
    screenshotsFolder: 'components/screenshots',
    numTestsKeptInMemory: 1,
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      host: '127.0.0.1',
      port: '8080',
    },
  },
})
