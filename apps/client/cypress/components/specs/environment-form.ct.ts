import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useProjectEnvironmentStore } from '@/stores/project-environment.js'
import { useQuotaStore } from '@/stores/quota.js'
import { useStageStore } from '@/stores/stage.js'
import { useZoneStore } from '@/stores/zone.js'

process.env.NODE_ENV = 'test'
process.env.CT = 'true'

describe('EnvironmentForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a EnvironmentForm', () => {
    const randomDbSetup = createRandomDbSetup({ envs: [] })
    randomDbSetup.quotas[0].isPrivate = true
    randomDbSetup.quotas[1].isPrivate = true
    randomDbSetup.quotas[2].isPrivate = false
    randomDbSetup.quotas[3].isPrivate = false

    const zones = randomDbSetup.zones
    const project: Required<typeof randomDbSetup.project> = randomDbSetup.project as Required<typeof randomDbSetup.project>
    const stageIds = randomDbSetup.stages.map(({ id }) => id)
    project.clusters = project.clusters.map(cluster => ({ ...cluster, stageIds }))

    cy.intercept('GET', 'api/v1/quotas', {
      body: randomDbSetup.quotas,
    }).as('listQuotas')
    cy.intercept('GET', 'api/v1/stages', {
      body: randomDbSetup.stages,
    }).as('listStages')
    cy.intercept('GET', 'api/v1/zones', {
      body: zones,
    }).as('listStages')

    useSnackbarStore()
    useProjectEnvironmentStore()
    useQuotaStore()
    useStageStore()

    const zoneStore = useZoneStore()
    zoneStore.zones = zones

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
      },
      projectClustersIds: project.clusters.map(({ id }) => id),
      allClusters: project.clusters,
    }

    // @ts-ignore
    cy.mount(EnvironmentForm, { props })

    cy.wait('@listQuotas').its('response').then($response => {
      expect($response.body.length).to.equal(4)
    })
    cy.wait('@listStages').its('response').then($response => {
      expect($response.body.length).to.equal(4)
    })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentFieldset').should('have.length', 1)
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', '')
    cy.get('select#zone-select')
      .should('have.value', null)
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
    cy.get('select#zone-select > option')
      .should('have.length', zoneStore.zones.length + 1)

    cy.get('select#zone-select')
      .select(1)
    cy.get('select#stage-select > option')
      .should('have.length', randomDbSetup.stages.length + 1)

    cy.get('select#stage-select')
      .select(1)
    cy.get('select#quota-select > option')
      .should('have.length', 3)

    cy.get('select#quota-select')
      .select(1)
    cy.get('select#cluster-select > option')
      .should('have.length', props.projectClustersIds.length + 1)

    cy.get('select#cluster-select')
      .select(1)
    cy.getByDataTestid('addEnvironmentBtn').should('be.enabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')
  })
})
