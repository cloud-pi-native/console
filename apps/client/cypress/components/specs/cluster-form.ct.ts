import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { getRandomCluster, getRandomEnv, getRandomProject, getRandomStage, getRandomZone, repeatFn } from '@cpn-console/test-utils'
import { ClusterPrivacy, deleteValidationInput } from '@cpn-console/shared'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import ClusterForm from '@/components/ClusterForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'

describe('ClusterForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a new cluster ClusterForm', () => {
    useSnackbarStore()

    const allProjects = repeatFn(5)(getRandomProject)
    const allStages = repeatFn(4)(getRandomStage)
    const allZones = repeatFn(3)(getRandomZone)

    const props = {
      allProjects,
      allStages,
      allZones,
      associatedEnvironments: [],
    }

    cy.mount(ClusterForm, { props })
    cy.getByDataTestid('tlsServerNameInput')
      .type('tlsServerName')
    cy.getByDataTestid('labelInput')
      .type('label')
    cy.getByDataTestid('input-checkbox-clusterResourcesCbx')
      .check({ force: true })
    cy.get('#privacy-select')
      .select(ClusterPrivacy.DEDICATED)
    cy.get('#zone-select')
      .select(1)
    cy.get('#projects-select')
      .click()
    cy.getByDataTestid(`${allProjects[0].id}-projects-select-tag`)
      .click()
    cy.get('#stages-select')
      .click()
    cy.getByDataTestid(`${allStages[1].id}-stages-select-tag`)
      .click()
    cy.getByDataTestid('addClusterBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteClusterZone').should('not.exist')
  })

  it('Should mount an update cluster ClusterForm', () => {
    useSnackbarStore()
    const allProjects = repeatFn(5)(getRandomProject)
    const allStages = repeatFn(2)(getRandomStage)
    const allZones = repeatFn(1)(getRandomZone)

    const props = {
      cluster: getRandomCluster({ projectIds: [allProjects[0].id], stageIds: [allStages[1].id], privacy: ClusterPrivacy.DEDICATED, zoneId: allZones[0].id }),
      allProjects,
      allStages,
      allZones,
      isNewCluster: false,
      associatedEnvironments: [],
    }

    cy.mount(ClusterForm, { props })

    cy.getByDataTestid('user-json').should('be.visible')
    cy.getByDataTestid('cluster-json').should('be.visible')
    cy.getByDataTestid('tlsServerNameInput')
      .should('have.value', props.cluster.kubeconfig.cluster.tlsServerName)
      .and('be.enabled')
    cy.getByDataTestid('labelInput')
      .should('have.value', props.cluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .should('have.value', props.cluster.infos)
      .and('be.enabled')
    cy.getByDataTestid('input-checkbox-clusterResourcesCbx')
      .should(props.cluster.clusterResources ? 'be.checked' : 'not.be.checked')
    cy.get('#privacy-select')
      .should('have.value', props.cluster.privacy)
    cy.get('#zone-select')
      .should('have.value', props.cluster.zoneId)
      .and('be.enabled')
    cy.get('#projects-select')
      .click()
    cy.get('#projects-select .fr-tag--dismiss')
      .should('have.length', props.cluster.projectIds?.length)
    cy.get('#stages-select')
      .click()
    cy.get('#stages-select .fr-tag--dismiss')
      .should('have.length', props.cluster.stageIds?.length)
    cy.getByDataTestid('updateClusterBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteClusterZone').should('exist')
    cy.getByDataTestid('showDeleteClusterBtn').click()
    cy.getByDataTestid('deleteClusterBtn').should('be.disabled')
    cy.getByDataTestid('deleteClusterInput').clear().type(deleteValidationInput)
    cy.getByDataTestid('deleteClusterBtn').should('be.enabled')
  })

  it('Should mount an update cluster ClusterForm with associated environments', () => {
    useSnackbarStore()
    const allProjects = repeatFn(5)(getRandomProject)
    const allStages = repeatFn(2)(getRandomStage)
    const allZones = repeatFn(2)(getRandomZone)

    const cluster = getRandomCluster({ projectIds: [allProjects[0].id], stageIds: [allStages[1].id], privacy: ClusterPrivacy.DEDICATED, zoneId: allZones[0].id })
    const env = getRandomEnv('integ-1', allProjects[0].id, 'qsId', cluster.id)
    const associatedEnvironments = [{ project: allProjects[0].name, name: env.name, owner: 'owner@dso.fr' }]

    const props = {
      cluster,
      allProjects,
      allStages,
      allZones,
      isNewCluster: false,
      associatedEnvironments,
    }

    cy.mount(ClusterForm, { props })

    cy.getByDataTestid('user-json').should('be.visible')
    cy.getByDataTestid('cluster-json').should('be.visible')
    cy.getByDataTestid('tlsServerNameInput')
      .should('have.value', props.cluster.kubeconfig.cluster.tlsServerName)
      .and('be.enabled')
    cy.getByDataTestid('labelInput')
      .should('have.value', props.cluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .should('have.value', props.cluster.infos)
      .and('be.enabled')
    cy.getByDataTestid('input-checkbox-clusterResourcesCbx')
      .should(props.cluster.clusterResources ? 'be.checked' : 'not.be.checked')
    cy.get('#privacy-select')
      .should('have.value', props.cluster.privacy)
    cy.get('#zone-select')
      .should('have.value', props.cluster.zoneId)
      .and('be.enabled')
    cy.get('#projects-select')
      .click()
    cy.get('#projects-select .fr-tag--dismiss')
      .should('have.length', props.cluster.projectIds?.length)
    cy.get('#stages-select')
      .click()
    cy.get('#stages-select .fr-tag--dismiss')
      .should('have.length', props.cluster.stageIds?.length)
    cy.getByDataTestid('updateClusterBtn').should('be.enabled')
    cy.getByDataTestid('deleteClusterZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsZone').should('exist')
  })

  it('Should disable project selector when privacy is public', () => {
    useSnackbarStore()

    const allProjects = repeatFn(5)(getRandomProject)

    const props = {
      allProjects,
      associatedEnvironments: [],
    }

    cy.mount(ClusterForm, { props })
    cy.get('#privacy-select')
      .select(ClusterPrivacy.DEDICATED)
    cy.get('#projects-select').should('be.visible')
    cy.get('#privacy-select')
      .select('public')
    cy.get('#projects-select').should('not.to.exist')
  })
})
