import type { User } from '@cpn-console/shared'
import { getModel } from '../../support/func'

const users = getModel('user') as User[]
const anonUser = users.find(user => user.email === 'anon@user') as User

describe('Administration users', () => {
  beforeEach(() => {
    cy.intercept('GET', 'api/v1/users').as('getAllUsers')

    cy.kcLogin('tcolin')
    cy.visit('/admin/users')

    cy.wait('@getAllUsers', { timeout: 10_000 }).its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should display admin users, loggedIn as admin', () => {
    users.forEach((user) => {
      cy.getByDataTestid(`user-${user.id}`)
        .should('contain.text', user.email)
        .should('contain.text', user.lastName)
        .should('contain.text', user.firstName)
        .parent()
        .should('contain.text', '202') // test que la date s'affiche
    })
    cy.getByDataTestid('input-checkbox-tableAdministrationUsersDisplayId')
      .should('exist')
      .click({ force: true })
    users.forEach((user) => {
      cy.getByDataTestid(`user-${user.id}`)
        .should('contain.text', user.id)
    })

    cy.getByDataTestid(`user-${anonUser.id}`).should('exist')
    cy.getByDataTestid('input-checkbox-tableAdministrationUsersHideBots')
      .should('exist')
      .click({ force: true })
    cy.getByDataTestid(`user-${anonUser.id}`).should('not.exist')
    cy.getByDataTestid('input-checkbox-tableAdministrationUsersHideBots')
      .should('exist')
      .click({ force: true })

    cy.getByDataTestid('tableAdministrationUsers')
      .find('tbody')
      .find('tr')
      .should('have.length.at.least', users.length)
    cy.getByDataTestid('tableAdministrationUsersSearch')
      .clear()
      .type(anonUser.email)
    cy.getByDataTestid('tableAdministrationUsers')
      .find('tbody')
      .find('tr')
      .should('have.length', 1)
  })
})
