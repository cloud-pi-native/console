import type { Pinia } from 'pinia'
import { createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import { getRandomEnv, getRandomQuota, getRandomStage, repeatFn } from '@cpn-console/test-utils'
import QuotaForm from '@/components/QuotaForm.vue'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useQuotaStore } from '@/stores/quota.js'

describe('QuotaForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a new quota QuotaForm', () => {
    useSnackbarStore()
    useQuotaStore()

    const allStages = repeatFn(4)(getRandomStage)

    const props = {
      isNewQuota: true,
      allStages,
    }

    cy.mount(QuotaForm, { props })
    cy.get('h1').invoke('text').should('match', /^Informations du quota $/)
    cy.getByDataTestid('updateQuotaBtn').should('not.exist')
    cy.getByDataTestid('addQuotaBtn').should('be.visible').and('be.disabled')
    cy.getByDataTestid('nameInput')
      .type('XXL')
    cy.get('h1').invoke('text').should('match', /^Informations du quota XXL$/)
    cy.getByDataTestid('memoryInput')
      .type('5Gi')
    cy.getByDataTestid('cpuInput')
      .clear().type('3')
    cy.getByDataTestid('input-checkbox-isQuotaPrivateCbx')
      .check({ force: true })
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
    cy.get('#stages-select')
      .click()
    cy.getByDataTestid(`${allStages[1].id}-stages-select-tag`)
      .click()
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
  })

  it('Should mount an update quota QuotaForm', () => {
    useSnackbarStore()
    const quotaStore = useQuotaStore()

    const allStages = repeatFn(2)(getRandomStage)
    quotaStore.quotas = [getRandomQuota(undefined, { stages: [allStages[0]] })]
    const quotaToUpdate = quotaStore.quotas[0]

    const associatedEnvironments = [
      getRandomEnv('env1', 'projectId', 'stageId', 'quotaId', 'clusterId'),
      getRandomEnv('env2', 'projectId', 'stageId2', 'quotaId2', 'clusterId'),
    ]

    const props = {
      quota: quotaToUpdate,
      allStages,
      associatedEnvironments,
    }

    cy.mount(QuotaForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du quota ${quotaToUpdate.name}`)
    cy.getByDataTestid('addQuotaBtn').should('not.exist')
    cy.getByDataTestid('updateQuotaBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .should('have.value', quotaToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid('memoryInput')
      .should('have.value', quotaToUpdate.memory)
      .and('be.disabled')
    cy.getByDataTestid('cpuInput')
      .should('have.value', quotaToUpdate.cpu)
      .and('be.disabled')
    cy.getByDataTestid('input-checkbox-isQuotaPrivateCbx')
      .should(quotaToUpdate.isPrivate ? 'be.checked' : 'not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.get('#stages-select')
      .click()
    cy.getByDataTestid(`${allStages[0].id}-stages-select-tag`)
      .should('exist')
    cy.getByDataTestid(`${allStages[1].id}-stages-select-tag`)
      .should('not.have.class', 'fr-tag--dismiss')
      .click()
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid('deleteQuotaZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsTable').should('exist')
      .find('tbody > tr')
      .should('have.length', associatedEnvironments.length)
  })

  it('Should mount an update quotaForm without associatedEnvironments', () => {
    useSnackbarStore()
    const adminQuotaStore = useQuotaStore()

    const allStages = repeatFn(2)(getRandomStage)
    adminQuotaStore.quotas = repeatFn(4)(getRandomQuota)
    const quotaToUpdate = adminQuotaStore.quotas[0]

    const props = {
      quota: quotaToUpdate,
      allStages,
    }

    cy.mount(QuotaForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du quota ${quotaToUpdate.name}`)
    cy.getByDataTestid('addQuotaBtn').should('not.exist')
    cy.getByDataTestid('updateQuotaBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .should('have.value', quotaToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid('memoryInput')
      .should('have.value', quotaToUpdate.memory)
      .and('be.disabled')
    cy.getByDataTestid('cpuInput')
      .should('have.value', quotaToUpdate.cpu)
      .and('be.disabled')
    cy.getByDataTestid('input-checkbox-isQuotaPrivateCbx')
      .should(quotaToUpdate.isPrivate ? 'be.checked' : 'not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.get('#stages-select')
      .click()
    cy.getByDataTestid(`${allStages[0].id}-stages-select-tag`)
      .should('exist')
    cy.getByDataTestid(`${allStages[1].id}-stages-select-tag`)
      .should('not.have.class', 'fr-tag--dismiss')
      .click()
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteQuotaZone').should('exist')
  })
})
