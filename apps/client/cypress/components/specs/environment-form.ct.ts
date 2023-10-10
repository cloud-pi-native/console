import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { createRandomDbSetup } from '@dso-console/test-utils'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { getModel } from '../../e2e/support/func'

describe('EnvironmentForm.vue', () => {
  const stages = getModel('stage')

  it('Should mount a EnvironmentForm', () => {
    const randomDbSetup = createRandomDbSetup({ envs: [] })

    cy.intercept('GET', 'api/v1/projects/environments/quotas', {
      body: stages,
    }).as('getQuotas')

    const pinia = createPinia()
    setActivePinia(pinia)

    useSnackbarStore(pinia)
    useProjectEnvironmentStore(pinia)

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
        stageId: randomDbSetup.stages[0].id,
        quotaId: '1b47ed30-c595-45a6-880d-22072c0650f1',
      },
      allStages: randomDbSetup.stages,
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

    cy.wait('@getQuotas').its('response').then($response => {
      expect($response.body.length).to.equal(4)
    })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentFieldset').should('have.length', 1)
    cy.get('select#environment-name-select')
      .should('have.value', randomDbSetup.stages[0].name)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 1)
    cy.get('datalist#rangeList')
      .find('option')
      .should('have.length', 2)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .invoke('val', 0)
      .trigger('input')
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 0)
    cy.getByDataTestid('addEnvironmentBtn').should('be.enabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')

    cy.get('select#environment-name-select')
      .select('prod')
    cy.get('datalist#rangeList')
      .find('option')
      .should('have.length', 4)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .invoke('val', 3)
      .trigger('input')
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 3)
    cy.getByDataTestid('addEnvironmentBtn').should('be.enabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')
  })
})
