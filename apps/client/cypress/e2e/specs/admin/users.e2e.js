import { getUsers } from '../../support/func.js'

describe('Administration users', () => {
  const users = getUsers().map(({ firstName, lastName, email }) => ({
    firstName,
    lastName,
    email,
  }))

  it('Should display admin users, loggedIn, is admin', () => {
    cy.intercept('GET', 'api/v1/admin/users').as('getAllUsers')

    cy.kcLogin('tcolin')
    cy.visit('/admin/users')
    cy.wait('@getAllUsers').its('response.statusCode').should('eq', 200)

    const values = []
    cy.get('tbody tr')
      .then($el => {
        $el.toArray()
          .forEach(row => {
            values.push({
              firstName: row.children[0].innerHTML,
              lastName: row.children[1].innerHTML,
              email: row.children[2].innerHTML,
            })
          })
      })

    cy.wrap(values).should('have.length', users.length)
    users.forEach(user => cy.wrap(values).should('deep.include', user))
  })
})
