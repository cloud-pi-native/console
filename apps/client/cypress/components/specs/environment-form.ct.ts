import { Pinia, createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import EnvironmentForm from '../../../src/components/EnvironmentForm.vue'
import { createRandomDbSetup } from '@dso-console/test-utils'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'

describe('EnvironmentForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a EnvironmentForm', () => {
    const randomDbSetup = createRandomDbSetup({ envs: [] })

    cy.intercept('GET', 'api/v1/quotas', {
      body: randomDbSetup.quotas,
    }).as('getQuotas')
    cy.intercept('GET', 'api/v1/stages', {
      body: randomDbSetup.stages,
    }).as('getStages')

    useSnackbarStore()
    useProjectEnvironmentStore()

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
      },
      projectClusters: randomDbSetup.project.clusters,
    }

    // @ts-ignore
    cy.mount(EnvironmentForm, { props })

    cy.wait('@getQuotas').its('response').then($response => {
      expect($response.body.length).to.equal(4)
    })
    cy.wait('@getStages').its('response').then($response => {
      expect($response.body.length).to.equal(4)
    })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentFieldset').should('have.length', 1)
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', '')
    cy.get('select#stage-select')
      .should('have.value', null)
    cy.get('select#quota-select')
      .should('not.exist')
    cy.get('select#cluster-select')
      .should('not.exist')
    cy.getByDataTestid('addEnvironmentBtn').should('be.disabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')

    cy.getByDataTestid('environmentNameInput')
      .clear().type('prod0')
    cy.get('select#stage-select > option')
      .should('have.length', randomDbSetup.stages.length + 1)
    cy.get('select#stage-select')
      .select(1)
    cy.get('select#quota-select > option')
      .should('have.length', randomDbSetup.quotas.length + 1)
    cy.get('select#quota-select')
      .select(1)
    cy.get('select#cluster-select > option')
      .should('have.length', props.projectClusters.length + 1)
    cy.get('select#cluster-select')
      .select(1)
    cy.getByDataTestid('addEnvironmentBtn').should('be.enabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')
  })
})
