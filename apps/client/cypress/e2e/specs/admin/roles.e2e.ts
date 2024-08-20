import { Role, User } from '@cpn-console/shared'
import { getModel } from '../../support/func.js'

describe('Administration roles', () => {
  const roles: Role[] = getModel('adminRole')
  const users: User[] = getModel('user')
  const newRole = {
    name: 'les copains',
    users: users.map(user => user.email),
  }
  const newOidcRole = {
    name: 'les copains oidc',
    oidcName: 'cops',
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/v1/admin/roles').as('listAdminRoles')
    cy.intercept('POST', '/api/v1/admin/roles').as('createRole')
    cy.intercept('PATCH', '/api/v1/admin/roles').as('patchRole')
    cy.intercept('PATCH', '/api/v1/users').as('patchUser')

    cy.kcLogin('tcolin')
    cy.visit('/admin/roles')
    cy.url().should('contain', '/admin/roles')
    cy.wait('@listAdminRoles')
      .its('response.statusCode').should('match', /^20\d$/)
  })

  it.only('Should add a new non-oidc role', () => {
    roles.forEach((role) => {
      cy.getByDataTestid(`${role.name}-tab`)
        .should('exist')
    })
    cy.getByDataTestid(`${newRole.name}-tab`)
      .should('not.exist')
    cy.getByDataTestid('addRoleBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Rôle ajouté')
    })
    cy.getByDataTestid('saveBtn')
      .should('be.disabled')
    cy.getByDataTestid('roleNameInput')
      .should('have.value', 'Nouveau rôle')
      .clear()
      .type(newRole.name)
    cy.getByDataTestid('saveBtn')
      .should('be.enabled')
      .click()
    cy.wait('@patchRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('test-membres')
      .click()
    cy.getByDataTestid('addUserBtn')
      .should('be.disabled')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(`${newRole.users[0]}{enter}`)
    cy.get('datalist#suggestionList')
      .find('option')
      .first()
      .click({ force: true })
      .blur()
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled')
      .click()
    cy.wait('@patchUser')
      .its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should add a new oidc role', () => {
    [...roles, newRole].forEach((role) => {
      cy.getByDataTestid(`${role.name}-tab`)
        .should('exist')
    })
    cy.getByDataTestid(`${newOidcRole.name}-tab`)
      .should('not.exist')
    cy.getByDataTestid('addRoleBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Rôle ajouté')
    })
    cy.getByDataTestid('saveBtn')
      .should('be.disabled')
    cy.getByDataTestid('roleNameInput')
      .should('have.value', 'Nouveau rôle')
      .clear()
      .type(newOidcRole.name)
    cy.getByDataTestid('oidcGroupInput')
      .type(newOidcRole.oidcName)
    cy.getByDataTestid('saveBtn')
      .should('be.enabled')
      .click()
    cy.wait('@patchRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('test-membres')
      .click()
    cy.getByDataTestid('addUserSuggestionInput')
      .should('not.exist')
    cy.get('#members')
      .should('contain', 'Les groupes ayant une liaison OIDC ne peuvent pas gérer leurs membres.')
  })
})
