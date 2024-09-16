import { mount } from '@cypress/vue'
import VueDsfr from '@gouvminint/vue-dsfr'

import 'virtual:uno.css'
import 'uno.css'
import 'virtual:unocss-devtools'
import '@/main.css'
// import { ComponentOptions, ComponentOptionsWithObjectProps } from 'vue'

Cypress.Commands.add('mount', (component, options = {}) => {
  // Setup options object
  options.global = options.global || {}
  options.global.components = options.global.components || {}
  options.global.plugins = options.global.plugins || []

  options.global.plugins.push({
    install(app) {
      app.use(VueDsfr)
    },
  })

  return mount(component, options)
})

Cypress.Commands.add('getByDataTestid', (dataTestid) => {
  cy.get(`[data-testid="${dataTestid}"]`)
})
