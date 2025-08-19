import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import EnvironmentForm from '@/components/EnvironmentForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useStageStore } from '@/stores/stage.js'
import { useZoneStore } from '@/stores/zone.js'
import type { ComponentCustomProps } from 'vue'

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

    const zones = randomDbSetup.zones
    const project: Required<typeof randomDbSetup.project> = randomDbSetup.project as Required<typeof randomDbSetup.project>
    const stageIds = randomDbSetup.stages.map(({ id }) => id)
    project.clusters = project.clusters.map(cluster => ({ ...cluster, stageIds }))

    cy.intercept('GET', 'api/v1/stages', {
      body: randomDbSetup.stages,
    }).as('listStages')
    cy.intercept('GET', 'api/v1/zones', {
      body: zones,
    }).as('listStages')

    useSnackbarStore()
    useStageStore()

    const zoneStore = useZoneStore()
    zoneStore.zones = zones

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
      },
      availableClusters: project.clusters,
      canManage: true,
    }

    cy.mount(EnvironmentForm, { props } as ComponentCustomProps)

    cy.wait('@listStages').its('response').then(($response) => {
      expect($response.body.length).to.equal(4)
    })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentFieldset').should('have.length', 1)
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', '')
    cy.getByDataTestid('cpuInput')
      .should('have.value', '')
    cy.getByDataTestid('gpuInput')
      .should('have.value', '')
    cy.getByDataTestid('memoryInput')
      .should('have.value', '')
    cy.get('select#zone-select')
      .should('have.value', null)
    cy.get('select#stage-select')
      .should('have.value', null)
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
    cy.get('select#cluster-select > option')
      .should('have.length', props.availableClusters.length + 1)

    cy.get('select#cluster-select')
      .select(1)
    cy.getByDataTestid('cpuInput')
      .clear().type('2')
    cy.getByDataTestid('gpuInput')
      .clear().type('0')
    cy.getByDataTestid('memoryInput')
      .clear().type('3.5')
    cy.getByDataTestid('addEnvironmentBtn').should('be.enabled')
    cy.getByDataTestid('cancelEnvironmentBtn').should('be.enabled')
  })
  it('Should mount a EnvironmentForm as viewer', () => {
    const randomDbSetup = createRandomDbSetup({ envs: [] })

    const zones = randomDbSetup.zones
    const project: Required<typeof randomDbSetup.project> = randomDbSetup.project as Required<typeof randomDbSetup.project>
    const stageIds = randomDbSetup.stages.map(({ id }) => id)
    project.clusters = project.clusters.map(cluster => ({ ...cluster, stageIds }))

    cy.intercept('GET', 'api/v1/stages', {
      body: randomDbSetup.stages,
    }).as('listStages')
    cy.intercept('GET', 'api/v1/zones', {
      body: zones,
    }).as('listStages')

    useSnackbarStore()
    useStageStore()

    const zoneStore = useZoneStore()
    zoneStore.zones = zones

    const props = {
      environment: {
        projectId: randomDbSetup.project.id,
        id: randomDbSetup.project.id,
        name: 'test',
        cpu: 2,
        gpu: 0,
        memory: 4,
        clusterId: project.clusters[0].id,
        stageId: randomDbSetup.stages[0].id,
        zoneId: randomDbSetup.zones[0].id,
      },
      availableClusters: project.clusters,
      canManage: false,
      isEditable: true,
    }

    cy.mount(EnvironmentForm, { props } as ComponentCustomProps)

    cy.wait('@listStages').its('response').then(($response) => {
      expect($response.body.length).to.equal(4)
    })

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentFieldset').should('have.length', 1)
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', 'test')
      .should('be.disabled')
    cy.get('select#zone-select')
      .should('have.value', props.environment.zoneId)
      .should('be.disabled')
    cy.get('select#stage-select')
      .should('have.value', props.environment.stageId)
      .should('be.disabled')
    cy.get('select#cluster-select')
      .should('have.value', props.environment.clusterId)
      .should('be.disabled')
    cy.getByDataTestid('cpuInput')
      .should('have.value', props.environment.cpu)
    cy.getByDataTestid('gpuInput')
      .should('have.value', props.environment.gpu)
    cy.getByDataTestid('memoryInput')
      .should('have.value', props.environment.memory)
    cy.getByDataTestid('addEnvironmentBtn').should('not.exist')
    cy.getByDataTestid('cancelEnvironmentBtn').should('not.exist')
  })
})
