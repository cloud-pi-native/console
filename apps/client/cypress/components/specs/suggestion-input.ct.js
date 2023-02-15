import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import SuggestionInput from '@/components/SuggestionInput.vue'
import { createRandomDbSetup } from 'test-utils'

describe('SuggestionInput.vue', () => {
  it('Should mount a SuggestionInput', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 5 })

    const props = {
      suggestions: randomDbSetup.users.map(user => user.email),
    }

    const extensions = {
      use: [
        [
          VueDsfr, { icons: Object.values(icons) },
        ],
      ],
      global: {
        plugins: [pinia],
      },
    }

    cy.mount(SuggestionInput, { extensions, props })

    cy.get('input[list="suggestionList"]')
      .should('have.length', 1)
      .and('have.value', '')
      .clear()
      .type(props.suggestions[0].slice(0, 2))
    cy.get('datalist#suggestionList')
      .should('have.length', 1)
      .find('option')
      .should('have.length', props.suggestions.length)
  })
})
