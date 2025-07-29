import type { Pinia } from 'pinia'
import { createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import { getRandomCluster, getRandomEnv, getRandomQuota, getRandomStage, repeatFn } from '@cpn-console/test-utils'
import StageForm from '@/components/StageForm.vue'
import { useSnackbarStore } from '@/stores/snackbar'

describe('StageForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })
  it('Should mount a new quota StageForm', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = [getRandomCluster({}), getRandomCluster({})]

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
      .type('integ')
    cy.get('h1').invoke('text').should('match', /^Informations du type d'environnement integ$/)
    cy.getByDataTestid('addStageBtn').should('be.enabled')
    cy.getByDataTestid(`${allQuotas[1].id}-quotas-select-tag`)
      .click()
    cy.getByDataTestid(`${allClusters[0].id}-clusters-select-tag`)
      .click()
    cy.getByDataTestid(`${allClusters[1].id}-clusters-select-tag`)
      .click()
    cy.getByDataTestid('addStageBtn').should('be.enabled')
  })

  it('Should mount an update stage StageForm', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = [getRandomCluster({}), getRandomCluster({})]
    // @ts-ignore
    const stageToUpdate = getRandomStage(undefined, { quotas: allQuotas, clusters: allClusters })
    const associatedEnvironments = [
      getRandomEnv('env1', 'projectId', 'quotaId', 'stageId', allClusters[0].id),
      getRandomEnv('env2', 'projectId', 'quotaId', 'stageId', allClusters[1].id),
    ]

    const props = {
      stage: stageToUpdate,
      allQuotas,
      allClusters,
      associatedEnvironments,
      isNewStage: false,
    }

    cy.mount(StageForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du type d'environnement ${stageToUpdate.name}`)
    cy.getByDataTestid('addStageBtn').should('not.exist')
    cy.getByDataTestid('updateStageBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .should('have.value', stageToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid(`${allQuotas[0].id}-quotas-select-tag`)
      .should('have.class', 'fr-tag--dismiss')
    cy.get('#quotas-select')
      .click()
    cy.getByDataTestid(`${allClusters[0].id}-clusters-select-tag`)
      .should('have.class', 'fr-tag--dismiss')
    cy.getByDataTestid('updateStageBtn').should('be.enabled')
    cy.getByDataTestid('deleteQuotaZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsTable').should('exist')
      .find('tbody > tr')
      .should('have.length', associatedEnvironments.length)
  })

  it('Should mount an update quotaForm without associatedEnvironments', () => {
    useSnackbarStore()
    const allQuotas = repeatFn(4)(getRandomQuota)
    const allClusters = [getRandomCluster({}), getRandomCluster({})]
    // @ts-ignore
    const stageToUpdate = getRandomStage(undefined, { clusters: [allClusters[0]], quotas: [allQuotas[0]] })

    const props = {
      stage: stageToUpdate,
      allQuotas,
      allClusters,
      isNewStage: false,
    }

    cy.mount(StageForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du type d'environnement ${stageToUpdate.name}`)
    cy.getByDataTestid('addStageBtn').should('not.exist')
    cy.getByDataTestid('updateStageBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .should('have.value', stageToUpdate.name)
      .and('be.disabled')
    cy.get('#quotas-select')
      .click()
    cy.getByDataTestid(`${allQuotas[0].id}-quotas-select-tag`)
      .should('have.class', 'fr-tag--dismiss')
    cy.getByDataTestid(`${allClusters[0].id}-clusters-select-tag`)
      .should('have.class', 'fr-tag--dismiss')
    cy.getByDataTestid('updateStageBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteStageZone').should('exist')
  })
})
