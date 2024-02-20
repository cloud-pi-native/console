import { Pinia, createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import StageForm from '@/components/StageForm.vue'
import { getRandomCluster, getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomStage, repeatFn } from '@cpn-console/test-utils'
import { useSnackbarStore } from '@/stores/snackbar.js'

describe('StageForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })
  it('Should mount a new quota StageForm', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = repeatFn(3)(getRandomCluster)

    const props = {
      isNewStage: true,
      allQuotas,
      allClusters,
    }

    cy.mount(StageForm, { props })
    cy.get('h1').invoke('text').should('match', /^Informations du type d'environnement $/)
    cy.getByDataTestid('updateStageBtn').should('not.exist')
    cy.getByDataTestid('addStageBtn').should('be.visible').and('be.disabled')
    cy.getByDataTestid('nameInput')
      .find('input')
      .type('integ')
    cy.get('h1').invoke('text').should('match', /^Informations du type d'environnement integ$/)
    cy.getByDataTestid('addStageBtn').should('be.enabled')
    cy.get('#quotas-select')
      .select(`${allQuotas[1].name}`)
    cy.get('#clusters-select')
      .select(`${allClusters[0].label}`)
    cy.get('#clusters-select')
      .select(`${allClusters[1].label}`)
    cy.getByDataTestid('addStageBtn').should('be.enabled')
  })

  it('Should mount an update stage StageForm', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = repeatFn(3)(getRandomCluster)
    const stageToUpdate = getRandomStage()
    const quotaStage = getRandomQuotaStage(allQuotas[0].id, stageToUpdate.id, 'active')
    // @ts-ignore
    stageToUpdate.quotaStage = [quotaStage]
    // @ts-ignore
    stageToUpdate.clusters = [allClusters[0]]
    const associatedEnvironments = [getRandomEnv('env1', 'projectId', quotaStage.id, allClusters[0].id), getRandomEnv('env2', 'projectId', quotaStage.id, allClusters[1].id)]

    const props = {
      stage: stageToUpdate,
      allQuotas,
      allClusters,
      associatedEnvironments,
    }

    cy.mount(StageForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du type d'environnement ${stageToUpdate.name}`)
    cy.getByDataTestid('addStageBtn').should('not.exist')
    cy.getByDataTestid('updateStageBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .find('input')
      .should('have.value', stageToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid(`${allQuotas[0].name}-quotas-select-tag`)
      .should('exist')
    cy.get('#quotas-select')
      .should('be.enabled')
    cy.getByDataTestid(`${allClusters[0].label}-clusters-select-tag`)
      .should('exist')
    cy.get('#clusters-select')
      .should('be.enabled')
    cy.getByDataTestid('updateStageBtn').should('be.enabled')
    cy.getByDataTestid('deleteQuotaZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsTable').should('exist')
      .find('tbody > tr')
      .should('have.length', associatedEnvironments.length)
  })

  it('Should mount an update quotaForm without associatedEnvironments', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = repeatFn(3)(getRandomCluster)
    const stageToUpdate = getRandomStage()
    const quotaStage = getRandomQuotaStage(allQuotas[0].id, stageToUpdate.id, 'active')
    // @ts-ignore
    stageToUpdate.quotaStage = [quotaStage]
    // @ts-ignore
    stageToUpdate.clusters = [allClusters[0]]

    const props = {
      stage: stageToUpdate,
      allQuotas,
      allClusters,
    }

    cy.mount(StageForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du type d'environnement ${stageToUpdate.name}`)
    cy.getByDataTestid('addStageBtn').should('not.exist')
    cy.getByDataTestid('updateStageBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .find('input')
      .should('have.value', stageToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid(`${allQuotas[0].name}-quotas-select-tag`)
      .should('exist')
    cy.get('#quotas-select')
      .should('be.enabled')
    cy.getByDataTestid(`${allClusters[0].label}-clusters-select-tag`)
      .should('exist')
    cy.get('#clusters-select')
      .should('be.enabled')
    cy.getByDataTestid('updateStageBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteStageZone').should('exist')
  })
})
