import type { PersonalAccessToken, User } from '@cpn-console/shared'
import { getModelById } from '../support/func.js'

const userClaire = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567') as User
const userTibo = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566') as User

describe('Header', () => {
  it('Should display name once logged', () => {
    cy.kcLogin((userClaire.firstName.slice(0, 1) + userClaire.lastName).toLowerCase())
      .visit('/')
      .getByDataTestid('menuUserList')
      .should('contain', `${userClaire.firstName} ${userClaire.lastName}`)
  })

  it('Should display profile infos', () => {
    cy.kcLogin('tcolin')
      .visit('/profile/info')
    cy.getByDataTestid('profileInfos')
      .should('contain.text', `${userTibo.lastName}, ${userTibo.firstName}`)
      .should('contain.text', userTibo.id)
      .should('contain.text', 'Admin')
      .should('contain.text', userTibo.email)
  })

  it('Should create pat', () => {
    let createdToken: PersonalAccessToken
    cy.intercept('GET', 'api/v1/user/tokens*').as('listTokens')
    cy.intercept('POST', 'api/v1/user/tokens').as('createToken')
    cy.intercept('DELETE', 'api/v1/user/tokens/*').as('deleteToken')

    cy.kcLogin('tcolin')
      .visit('/profile/tokens')
    cy.wait('@listTokens', { timeout: 15_000 })
    cy.url().should('contain', '/profile/tokens')
    cy.getByDataTestid('showNewTokenFormBtn')
      .click()

    cy.getByDataTestid('newTokenName')
      .click()
      .clear()
      .type('test2')
    cy.getByDataTestid('expirationDateInput')
      .click()
      .clear()
      .type('2100-11-22')
    cy.getByDataTestid('saveBtn')
      .click()
    cy.wait('@createToken').its('response').then((response) => {
      createdToken = response.body
      cy.getByDataTestid('newTokenPassword')
        .should('be.visible')

      // Réinitialiser le formulaire
      cy.getByDataTestid('showNewTokenFormBtn')
        .click()
      cy.getByDataTestid('newTokenPassword').should('not.exist')
      cy.wait('@listTokens', { timeout: 15_000 })

      cy.getByDataTestid(`token-${createdToken?.id}`).within(() => {
        cy.get('td:nth-of-type(1)').should('contain', 'test2')
        cy.get('td:nth-of-type(2)').should('contain', (new Date()).getFullYear())
        cy.get('td:nth-of-type(3)').should('contain', 2100)
        cy.get('td:nth-of-type(4)').should('contain', 'Jamais')
        cy.get('td:nth-of-type(5)').should('contain', 'Actif')
        cy.get('td:nth-of-type(6)')
          .click()
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
})
