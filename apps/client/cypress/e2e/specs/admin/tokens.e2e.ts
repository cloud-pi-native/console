import { getModel } from '../../support/func.js'

const tokens = getModel('adminToken')

describe('Administration tokens', () => {
  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/tokens*').as('listTokens')
    cy.intercept('POST', 'api/v1/admin/tokens').as('createToken')
    cy.intercept('DELETE', 'api/v1/admin/tokens/*').as('deleteToken')

    cy.kcLogin('tcolin')
    cy.visit('/admin/tokens')
    cy.wait('@listTokens', { timeout: 10_000 })
  })

  it('Should display tokens list, loggedIn as admin', () => {
    cy.getByDataTestid('tokenTable').within(() => {
      tokens.forEach((token) => {
        cy.get(`tbody tr:nth-of-type(1)`).within(() => {
          cy.get('td:nth-of-type(1)').should('contain', token.name)
          cy.get('td:nth-of-type(2)').should('contain', 'Administration globale')
          cy.get('td:nth-of-type(3)').should('contain', '-')
          cy.get('td:nth-of-type(4)').should('exist')
          cy.get('td:nth-of-type(5)').should('contain', 'Jamais')
          cy.get('td:nth-of-type(6)').should('contain', 'Jamais')
          cy.get('td:nth-of-type(7)').should('contain', 'Actif')
          cy.get('td:nth-of-type(8)')
        })
      })
    })
  })

  it('Should create and delete tokens list, loggedIn as admin', () => {
    cy.getByDataTestid('showNewTokenFormBtn')
      .click()

    cy.getByDataTestid('newTokenName')
      .click()
      .clear()
      .type('test2')
    cy.getByDataTestid('saveBtn')
      .click()
    cy.wait('@createToken').its('response').then((response) => {
      const password = response.body.password
      cy.request({
        url: '/api/v1/admin/tokens',
        followRedirect: false,
        headers: {
          'X-DSO-TOKEN': password,
        },
        method: 'GET',
      }).then((resp) => {
        expect(resp.status).to.eq(200)
      })
    })
    cy.getByDataTestid('newTokenPassword')
      .should('be.visible')

    // Réinitialiser le formulaire
    cy.getByDataTestid('showNewTokenFormBtn')
      .click()
    cy.getByDataTestid('newTokenPassword').should('not.exist')

    cy.getByDataTestid('tokenTable').within(() => {
      cy.get(`tbody tr:nth-of-type(1)`).within(() => {
        cy.get('td:nth-of-type(1)').should('contain', 'test')
        cy.get('td:nth-of-type(2)').should('contain', 'Administration globale')
        cy.get('td:nth-of-type(3)').should('contain', '-')
        cy.get('td:nth-of-type(4)').should('exist')
        cy.get('td:nth-of-type(5)').should('contain', 'Jamais')
        cy.get('td:nth-of-type(6)').should('contain', 'Jamais')
        cy.get('td:nth-of-type(7)').should('contain', 'Actif')
        cy.get('td:nth-of-type(8)')
      })
      cy.get(`tbody tr:nth-of-type(2)`).within(() => {
        cy.get('td:nth-of-type(1)').should('contain', 'test2')
        cy.get('td:nth-of-type(2)').should('contain', 'Administration globale')
        cy.get('td:nth-of-type(3)').should('contain.text', '@bot.io')
        cy.get('td:nth-of-type(4)').should('exist')
        cy.get('td:nth-of-type(5)').should('contain', 'Jamais')
        cy.get('td:nth-of-type(6)').should('contain', 'Jamais')
        cy.get('td:nth-of-type(7)').should('contain', 'Actif')
        cy.get('td:nth-of-type(8)')
          .click()
      })
    })
    cy.getByDataTestid('confirmDeletionBtn')
      .click()
    cy.wait('@deleteToken')
    cy.getByDataTestid('tokenTable').within(() => {
      cy.get(`tbody tr`)
        .should('have.length', 1)
    })
  })
})
