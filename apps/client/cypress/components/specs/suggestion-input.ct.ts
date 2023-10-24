import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import SuggestionInput from '@/components/SuggestionInput.vue'
import { createRandomDbSetup } from '@dso-console/test-utils'

describe('SuggestionInput.vue', () => {
  it('Should mount a SuggestionInput', () => {
    const randomDbSetup = createRandomDbSetup({ nbUsers: 5 })

    const props = {
      suggestions: randomDbSetup.users.map(user => user.email),
    }

    cy.mount(SuggestionInput, { props })

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
