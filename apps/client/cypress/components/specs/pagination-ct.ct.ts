import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import PaginationCt from '@/components/PaginationCt.vue'

describe('PaginationCt.vue', () => {
  it('Should mount a MultiSelector, first page', () => {
    const props = {
      length: 15,
      step: 2,
      page: 0,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `0 - ${props.step} sur ${props.length}`)
    cy.getByDataTestid('seeFirstLogsBtn').should('be.disabled')
    cy.getByDataTestid('seePreviousLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.enabled')
  })

  it('Should mount a MultiSelector, page 1', () => {
    const props = {
      length: 20,
      step: 5,
      page: 1,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `${props.step} - ${props.step * 2} sur ${props.length}`)
    cy.getByDataTestid('seeFirstLogsBtn').should('be.enabled')
    cy.getByDataTestid('seePreviousLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.enabled')
  })

  it('Should mount a MultiSelector, last page', () => {
    const props = {
      length: 43,
      step: 10,
      page: 4,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `40 - ${props.length} sur ${props.length}`)
    cy.getByDataTestid('seeFirstLogsBtn').should('be.enabled')
    cy.getByDataTestid('seePreviousLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.disabled')
  })
})
