import { Pinia, createPinia, setActivePinia } from 'pinia'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import QuotaForm from '@/components/QuotaForm.vue'
import { getRandomEnv, getRandomQuota, getRandomQuotaStage, getRandomStage, repeatFn } from '@dso-console/test-utils'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { useAdminQuotaStore } from '@/stores/admin/quota.js'

describe('QuotaForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a new quota QuotaForm', () => {
    useSnackbarStore()
    useAdminQuotaStore()

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
      .find('input')
      .type('XXL')
    cy.get('h1').invoke('text').should('match', /^Informations du quota XXL$/)
    cy.getByDataTestid('memoryInput')
      .find('input')
      .type('5Gi')
    cy.getByDataTestid('addQuotaBtn').should('be.disabled')
    cy.getByDataTestid('cpuInput')
      .find('input')
      .type('3')
    cy.getByDataTestid('isQuotaPrivateCbx').find('input[type=checkbox]')
      .check({ force: true })
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
    cy.get('#stages-select')
      .select(`${allStages[1].name}`)
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
  })

  it('Should mount an update quota QuotaForm', () => {
    useSnackbarStore()
    const adminQuotaStore = useAdminQuotaStore()

    const allStages = repeatFn(2)(getRandomStage)
    adminQuotaStore.quotas = repeatFn(4)(getRandomQuota)
    const quotaToUpdate = adminQuotaStore.quotas[0]
    const quotaStage = getRandomQuotaStage(quotaToUpdate.id, allStages[0].id)
    quotaToUpdate.quotaStage = [quotaStage]
    const associatedEnvironments = [getRandomEnv('env1', 'projectId', quotaStage.id, 'clusterId'), getRandomEnv('env2', 'projectId', quotaStage.id, 'clusterId')]

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
      .find('input')
      .should('have.value', quotaToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid('memoryInput')
      .find('input')
      .should('have.value', quotaToUpdate.memory)
      .and('be.disabled')
    cy.getByDataTestid('cpuInput')
      .find('input')
      .should('have.value', quotaToUpdate.cpu)
      .and('be.disabled')
    cy.getByDataTestid('isQuotaPrivateCbx').find('input[type=checkbox]')
      .should(quotaToUpdate.isPrivate ? 'be.checked' : 'not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid(`${allStages[0].name}-stages-select-tag`)
      .should('exist')
    cy.get('#stages-select')
      .should('be.enabled')
      .select(`${allStages[1].name}`)
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid('deleteQuotaZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsTable').should('exist')
      .find('tbody > tr')
      .should('have.length', associatedEnvironments.length)
  })

  it('Should mount an update quotaForm without associatedEnvironments', () => {
    useSnackbarStore()
    const adminQuotaStore = useAdminQuotaStore()

    const allStages = repeatFn(2)(getRandomStage)
    adminQuotaStore.quotas = repeatFn(4)(getRandomQuota)
    const quotaToUpdate = adminQuotaStore.quotas[0]
    const quotaStage = getRandomQuotaStage(quotaToUpdate.id, allStages[0].id)
    quotaToUpdate.quotaStage = [quotaStage]

    const props = {
      quota: quotaToUpdate,
      allStages,
    }

    cy.mount(QuotaForm, { props })
    cy.get('h1').invoke('text').should('contain', `Informations du quota ${quotaToUpdate.name}`)
    cy.getByDataTestid('addQuotaBtn').should('not.exist')
    cy.getByDataTestid('updateQuotaBtn').should('be.visible').and('be.enabled')
    cy.getByDataTestid('nameInput')
      .find('input')
      .should('have.value', quotaToUpdate.name)
      .and('be.disabled')
    cy.getByDataTestid('memoryInput')
      .find('input')
      .should('have.value', quotaToUpdate.memory)
      .and('be.disabled')
    cy.getByDataTestid('cpuInput')
      .find('input')
      .should('have.value', quotaToUpdate.cpu)
      .and('be.disabled')
    cy.getByDataTestid('isQuotaPrivateCbx').find('input[type=checkbox]')
      .should(quotaToUpdate.isPrivate ? 'be.checked' : 'not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid(`${allStages[0].name}-stages-select-tag`)
      .should('exist')
    cy.get('#stages-select')
      .should('be.enabled')
      .select(`${allStages[1].name}`)
    cy.getByDataTestid('updateQuotaBtn').should('be.enabled')
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteQuotaZone').should('exist')
  })
})
