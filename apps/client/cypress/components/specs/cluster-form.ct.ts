import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { getRandomCluster, getRandomEnv, getRandomProject, getRandomStage, repeatFn } from '@dso-console/test-utils'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import ClusterForm from '@/components/ClusterForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminClusterStore } from '@/stores/admin/cluster.js'

const repeatFn5Times = repeatFn(5)
const get5RandomProjects = () => repeatFn5Times(getRandomProject)

describe('ClusterForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a new cluster ClusterForm', () => {
    useSnackbarStore()

    const allProjects = get5RandomProjects()
    const allStages = repeatFn(4)(getRandomStage)

    const props = {
      allProjects,
      allStages,
    }

    cy.mount(ClusterForm, { props })
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .type('tlsServerName')
    cy.getByDataTestid('labelInput')
      .find('input')
      .type('label')
    cy.getByDataTestid('clusterResourcesCbx').find('input[type=checkbox]')
      .check({ force: true })
    cy.get('#privacy-select')
      .select('dedicated')
    cy.get('#projects-select')
      .select(`${allProjects[0].organization.name} - ${allProjects[0].name}`)
    cy.get('#stages-select')
      .select(`${allStages[1].name}`)
    cy.getByDataTestid('addClusterBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteClusterZone').should('not.exist')
  })

  it('Should mount an update cluster ClusterForm', () => {
    useSnackbarStore()
    const adminClusterStore = useAdminClusterStore()

    const allProjects = get5RandomProjects()
    const allStages = repeatFn(2)(getRandomStage)
    adminClusterStore.clusters = [getRandomCluster([allProjects[0].id], [allStages[1].id])]

    const props = {
      cluster: adminClusterStore.clusters[0],
      allProjects,
      allStages,
      isNewCluster: false,
    }

    cy.mount(ClusterForm, { props })

    cy.getByDataTestid('user-json').should('be.visible')
    cy.getByDataTestid('cluster-json').should('be.visible')
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .should('have.value', props.cluster.cluster.tlsServerName)
      .and('be.enabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', props.cluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', props.cluster.infos)
      .and('be.enabled')
    cy.getByDataTestid('clusterResourcesCbx').find('input[type=checkbox]')
      .should(props.cluster.clusterResources ? 'be.checked' : 'not.be.checked')
    cy.get('#privacy-select')
      .should('have.value', props.cluster.privacy)
    cy.get('#privacy-select')
      .select('dedicated')
    cy.get('[data-testid$="projects-select-tag"]')
      .should('have.length', props.cluster.projectIds?.length)
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', props.cluster.stageIds?.length)
    cy.getByDataTestid('updateClusterBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteClusterZone').should('exist')
    cy.getByDataTestid('showDeleteClusterBtn').click()
    cy.getByDataTestid('deleteClusterBtn').should('be.disabled')
    cy.getByDataTestid('deleteClusterInput').clear().type(props.cluster.label)
    cy.getByDataTestid('deleteClusterBtn').should('be.enabled')
  })

  it('Should mount an update cluster ClusterForm with associated environments', () => {
    useSnackbarStore()
    const adminClusterStore = useAdminClusterStore()

    const allProjects = get5RandomProjects()
    const allStages = repeatFn(2)(getRandomStage)
    // @ts-ignore
    adminClusterStore.clusters = [getRandomCluster([allProjects[0].id], [allStages[1].id])]
    const env = getRandomEnv('integ-1', allProjects[0].id, 'qsId', adminClusterStore.clusters[0].id)
    const associatedEnvironments = [{ organization: allProjects[0].organization.name, project: allProjects[0].name, environment: env.name, owner: 'owner@dso.fr' }]

    const props = {
      cluster: adminClusterStore.clusters[0],
      allProjects,
      allStages,
      isNewCluster: false,
      associatedEnvironments,
    }

    cy.mount(ClusterForm, { props })

    cy.getByDataTestid('user-json').should('be.visible')
    cy.getByDataTestid('cluster-json').should('be.visible')
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .should('have.value', props.cluster.cluster.tlsServerName)
      .and('be.enabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', props.cluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', props.cluster.infos)
      .and('be.enabled')
    cy.getByDataTestid('clusterResourcesCbx').find('input[type=checkbox]')
      .should(props.cluster.clusterResources ? 'be.checked' : 'not.be.checked')
    cy.get('#privacy-select')
      .should('have.value', props.cluster.privacy)
    cy.get('#privacy-select')
      .select('dedicated')
    cy.get('[data-testid$="projects-select-tag"]')
      .should('have.length', props.cluster.projectIds?.length)
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', props.cluster.stageIds?.length)
    cy.getByDataTestid('updateClusterBtn').should('be.enabled')
    cy.getByDataTestid('deleteClusterZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsZone').should('exist')
  })

  it('Should disable project selector when privacy is public', () => {
    useSnackbarStore()

    const allProjects = get5RandomProjects()

    const props = {
      allProjects,
    }

    cy.mount(ClusterForm, { props })
    cy.get('#privacy-select')
      .select('dedicated')
    cy.get('#projects-select').should('be.visible')
    cy.get('#privacy-select')
      .select('public')
    cy.get('#projects-select').should('not.to.exist')
  })
})
