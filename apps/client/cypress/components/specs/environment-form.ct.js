import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { createRandomDbSetup } from 'test-utils'
import { useProjectStore } from '@/stores/project.js'

describe('EnvironmentForm.vue', () => {
  it('Should mount a EnvironmentForm', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ envs: [] })
    const projectStore = useProjectStore(pinia)
    projectStore.selectedProject = randomDbSetup

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
        name: 'dev',
      },
      isEditable: true,

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

    cy.mount(EnvironmentForm, { extensions, props })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
      .getByDataTestid('environmentFieldset').should('have.length', 1)
      .getByDataTestid('environmentNameSelect')
      .find('select')
      .should('have.value', props.environment.name)
      .getByDataTestid('addEnvironmentBtn').should('be.enabled')
      .getByDataTestid('cancelEnvironmentBtn').should('be.enabled')
  })
})
