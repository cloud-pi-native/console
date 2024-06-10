import { getModel } from '../../support/func.js'

describe('Administration users', () => {
  const users = getModel('user').map(({ id, firstName, lastName, email }) => ({
    id,
    firstName,
    lastName,
    email,
    isAdmin: false,
  }))

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/users').as('getAllUsers')

    cy.kcLogin('tcolin')
    cy.visit('/admin/users')

    cy.wait('@getAllUsers').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should display admin users, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationUsers').find('tbody').within(() => {
      users.forEach(user => {
        cy.get('tr > td')
          .contains(user.id)
          .click()
        cy.assertClipboard(user.id)
        cy.get('tr > td')
          .contains(user.firstName)
        cy.get('tr > td')
          .contains(user.lastName)
        cy.get('tr > td')
          .contains(user.email)
        cy.getByDataTestid(`${user.id}-is-admin`)
          .should(user.isAdmin ? 'be.checked' : 'not.be.checked')
      })
    })
  })

  it('Should filter admin users, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationUsers').find('tbody').within(() => {
      cy.get('tr')
        .should('have.length', users.length)
    })
    cy.getByDataTestid('tableAdministrationUsersSearch')
      .find('input')
      .clear()
      .type(users[1].email)
    cy.getByDataTestid('tableAdministrationUsers').find('tbody').within(() => {
      cy.get('tr')
        .should('have.length', 1)
      cy.get('tr > td')
        .contains(users[1].firstName)
      cy.get('tr > td')
        .contains(users[1].lastName)
      cy.get('tr > td')
        .contains(users[1].email)
    })
  })
})
