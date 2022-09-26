const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://dso-client:80',
    specPattern: 'e2e/specs/**/*.{cy,e2e}.js',
    supportFile: 'e2e/support/index.js',
    video: false,
  },
  components: {
    baseUrl: 'http://dso-client:80',
    specPattern: 'components/specs/**/*.{cy,ct}.js',
    supportFile: 'components/support/index.js',
    video: false,
  },
})
