import path from 'node:path'
import { defineConfig } from 'cypress'
import vitePreprocessor from 'cypress-vite'
import viteConfig from './vite.config.js'

const argocdUrl = process.env.ARGOCD_URL ?? 'https://argo-cd.readthedocs.io'
const gitlabUrl = process.env.GITLAB_URL ?? 'https://gitlab.com'
const harborUrl = process.env.HARBOR_URL ?? 'https://goharbor.io'
const nexusUrl = process.env.NEXUS_URL ?? 'https://sonatype.com/products/nexus-repository'
const sonarqubeUrl = process.env.SONARQUBE_URL ?? 'https://www.sonarqube.org'
const vaultUrl = process.env.VAULT_URL ?? 'https://www.vaultproject.io'
const clientHost = process.env.CLIENT_HOST ?? 'localhost'
const clientPort = process.env.CLIENT_PORT ?? '8080'

if (viteConfig.server) {
  viteConfig.server.host = '127.0.0.1'
  viteConfig.server.port = 9000
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('file:preprocessor', vitePreprocessor({
        configFile: path.resolve('./vite.config.ts'),
        mode: 'development',
      }))
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          launchOptions.args.push('--disable-background-networking')
          launchOptions.args.push('--disable-service-worker')
          launchOptions.args.push('--disable-extensions')
          launchOptions.args.push('--disable-sync')
        }
        if (browser.family === 'firefox') {
          launchOptions.preferences['network.proxy.testing_localhost_is_secure_when_hijacked'] = true
          launchOptions.preferences['dom.serviceWorkers.enabled'] = false
        }
        return launchOptions
      })
      return config
    },
    viewportHeight: 1024,
    viewportWidth: 1280,
    baseUrl: `http://${clientHost}:${clientPort}`,
    fixturesFolder: 'cypress/e2e/fixtures',
    specPattern: 'cypress/e2e/specs/**/*.{cy,e2e}.{j,t}s',
    supportFile: 'cypress/e2e/support/index.ts',
    video: false,
    screenshotsFolder: 'cypress/e2e/screenshots',
    numTestsKeptInMemory: 2,
    chromeWebSecurity: false,
    experimentalModifyObstructiveThirdPartyCode: true,
    experimentalCspAllowList: true,
    experimentalWebKitSupport: false,
    env: {
      argocdUrl,
      gitlabUrl,
      nexusUrl,
      harborUrl,
      sonarqubeUrl,
      vaultUrl,
      clientHost,
      clientPort,
    },
  },

  component: {
    specPattern: 'cypress/components/specs/**/*.{cy,ct}.{j,t}s',
    supportFile: 'cypress/components/support/index.ts',
    indexHtmlFile: 'cypress/components/support/component-index.html',
    video: false,
    screenshotsFolder: 'cypress/components/screenshots',
    numTestsKeptInMemory: 1,
    devServer: {
      framework: 'vue',
      bundler: 'vite',
      viteConfig,
    },
  },
})
