import { type Pinia, createPinia, setActivePinia } from 'pinia'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import TokenForm from '@/components/TokenForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'

describe('TokenForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a TokenForm', () => {
    useSnackbarStore()
    // @ts-ignore
    cy.mount(TokenForm, { props: {
      exposedToken: undefined,
    } })

    cy.getByDataTestid('saveBtn')
      .should('be.disabled')

    cy.getByDataTestid('newTokenName')
      .type('test')

    cy.getByDataTestid('saveBtn')
      .should('be.enabled')
      .click()
  })

  it('Should mount a TokenForm', () => {
    const password = 'dfvbjfdbvjkdbvdfb'

    useSnackbarStore()
    // @ts-ignore
    cy.mount(TokenForm, { props: {
      exposedToken: password,
    } })

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
  })
})
