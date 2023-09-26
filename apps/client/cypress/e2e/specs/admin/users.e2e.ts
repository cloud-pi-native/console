import { getModel } from '../../support/func'

describe('Administration users', () => {
  const users = getModel('user').map(({ id, firstName, lastName, email }) => ({
    id,
    firstName,
    lastName,
    email,
  }))

  it('Should display admin users, loggedIn, is admin', () => {
    cy.intercept('GET', 'api/v1/admin/users').as('getAllUsers')

    cy.kcLogin('tcolin')
    cy.visit('/admin/users')
    cy.wait('@getAllUsers').its('response.statusCode').should('eq', 200)

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
      })
    })
  })
})
