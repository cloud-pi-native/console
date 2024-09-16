import PaginationCt from '@/components/PaginationCt.vue'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

describe('PaginationCt.vue', () => {
  it('Should mount a PaginationCt, first page', () => {
    const props = {
      length: 15,
      step: 2,
      page: 0,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `1 - 2 sur ${props.length}`)
    cy.getByDataTestid('seeFirstPageBtn').should('be.disabled')
    cy.getByDataTestid('seePreviousPageBtn').should('be.disabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.enabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.enabled')
  })

  it('Should mount a PaginationCt, page 1', () => {
    const props = {
      length: 20,
      step: 5,
      page: 1,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `6 - 10 sur ${props.length}`)
    cy.getByDataTestid('seeFirstPageBtn').should('be.enabled')
    cy.getByDataTestid('seePreviousPageBtn').should('be.enabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.enabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.enabled')
  })

  it('Should mount a PaginationCt, last page', () => {
    const props = {
      length: 43,
      step: 10,
      page: 4,
    }

    cy.mount(PaginationCt, { props })
    cy.getByDataTestid('positionInfo').should('contain', `41 - 43 sur ${props.length}`)
    cy.getByDataTestid('seeFirstPageBtn').should('be.enabled')
    cy.getByDataTestid('seePreviousPageBtn').should('be.enabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.disabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.disabled')
  })
})
