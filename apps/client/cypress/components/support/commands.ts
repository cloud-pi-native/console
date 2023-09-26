import { mount } from '@cypress/vue'

Cypress.Commands.add('mount', mount)

Cypress.Commands.add('getByDataTestid', (dataTestid) => {
  cy.get(`[data-testid="${dataTestid}"]`)
})
