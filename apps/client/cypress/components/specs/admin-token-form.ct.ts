import { type Pinia, createPinia, setActivePinia } from 'pinia'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import AdminTokenForm from '@/components/AdminTokenForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'

describe('AdminTokenForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a AdminTokenForm', () => {
    const password = 'dfvbjfdbvjkdbvdfb'
    cy.intercept('GET', 'api/v1/admin/tokens', {
      body: [],
    }).as('listTokens')
    cy.intercept('POST', 'api/v1/admin/tokens', {
      body: { password },
      statusCode: 201,
    }).as('createToken')

    useSnackbarStore()
    // @ts-ignore
    cy.mount(AdminTokenForm, { props: {} })

    cy.getByDataTestid('showNewTokenFormBtn')
      .click()

    cy.getByDataTestid('saveBtn')
      .should('be.disabled')

    cy.getByDataTestid('newTokenName')
      .type('test')

    cy.getByDataTestid('saveBtn')
      .should('be.enabled')
      .click()

    cy.wait('@createToken')
    cy.getByDataTestid('newTokenPassword')
      .get('input')
      .should('be.visible')
      .should('contain.value', password)
      .should('have.attr', 'type', 'password')

    cy.getByDataTestid('showNewTokenPassword')
      .click()

    cy.getByDataTestid('newTokenPassword')
      .get('input')
      .should('have.attr', 'type', 'text')

    cy.getByDataTestid('showNewTokenPassword')
      .click()

    cy.getByDataTestid('newTokenPassword')
      .get('input')
      .should('have.attr', 'type', 'password')

    cy.getByDataTestid('showNewTokenFormBtn')
      .click()

    cy.getByDataTestid('newTokenPassword')
      .should('not.exist')

    cy.getByDataTestid('newTokenName')
      .should('have.value', '')
  })
})
