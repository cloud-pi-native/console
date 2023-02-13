import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import SuggestionInput from '@/components/SuggestionInput.vue'
import { createRandomDbSetup } from 'test-utils'
import { useProjectStore } from '@/stores/project.js'

// TODO ce test passe en mode open, erreur en mode ci :
// [469:0100/000000.054933:ERROR:connection.cc(46)] X connection error received.
// The Test Runner unexpectedly exited via a exit event with signal SIGSEGV
describe('SuggestionInput.vue', () => {
  it('Should mount a SuggestionInput', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 5 })
    const projectStore = useProjectStore(pinia)
    projectStore.selectedProject = randomDbSetup

    const props = {
      datalist: randomDbSetup.users.map(user => user.email),
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

    const email = props.datalist[0]

    cy.mount(SuggestionInput, { extensions, props })

    cy.get('input[list="suggestionInput"]')
      .should('have.length', 1)
      .and('have.value', '')
      .type(email.substring(0, 2))
    cy.get('datalist#suggestionInput')
      .should('have.length', 1)
      .find('option')
      .should('have.length', props.datalist.length)
  })
})
