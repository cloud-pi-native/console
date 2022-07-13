const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://dso-client:80",
    specPattern: "**/*.{cy,e2e}.js",
    supportFile: "support/index.js",
    video: false,
  }
})
