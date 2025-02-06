import type { Role, User } from '@cpn-console/shared'
import { getModel } from '../../support/func.js'

const roles: Role[] = getModel('adminRole')
const users: User[] = getModel('user').filter(user => user.type === 'human')
const newRole = {
  name: 'les copains locaux',
  users,
}
const newOidcRole = {
  name: 'les copains oidc',
  oidcName: 'cops',
}

describe('Administration roles', () => {
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

  it('should list admin roles', () => {
    roles.forEach((role) => {
      cy.getByDataTestid(`${role.id}-tab`)
        .should('be.visible')
    })
  })

  it('Should add a new oidc role', () => {
    cy.get('[data-testid$="-tab"]').contains(newOidcRole.name)
      .should('not.exist')
    cy.getByDataTestid('addRoleBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('snackbar').should('contain', 'Rôle ajouté')
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
    cy.get('[data-testid$="-tab"]').contains(newOidcRole.name)
      .should('be.visible')
    cy.getByDataTestid('test-members')
      .click()
    cy.getByDataTestid('addUserSuggestionInput')
      .should('not.exist')
    cy.get('div#members')
      .should('contain', 'Les groupes ayant une liaison OIDC ne peuvent pas gérer leurs membres.')
  })

  it('Should add a new non-oidc role', () => {
    cy.get('[data-testid$="-tab"]').contains(newRole.name)
      .should('not.exist')
    cy.getByDataTestid('addRoleBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid('snackbar').should('contain', 'Rôle ajouté')
    cy.getByDataTestid('saveBtn')
      .should('be.disabled')
    cy.getByDataTestid('roleNameInput')
      .should('have.value', 'Nouveau rôle')
      .clear()
      .type(newRole.name)
    cy.get('input[name=MANAGE]')
      .check({ force: true })
    cy.getByDataTestid('saveBtn')
      .should('be.enabled')
      .click()
    cy.wait('@patchRole')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.get('[data-testid$="-tab"]').contains(newRole.name)
      .should('be.visible')
  })

  it('Should add a user to a role', () => {
    cy.get('[data-testid$="-tab"]').contains(newRole.name)
      .click()
    cy.getByDataTestid('test-members')
      .click()
    cy.getByDataTestid('addUserBtn')
      .should('be.disabled')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(`${newRole.users[0].email}{enter}`)
    cy.get('datalist#suggestionList')
      .find('option')
      .first()
      .click({ force: true })
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled')
      .click()
    cy.wait('@patchUser')
      .its('response.statusCode').should('match', /^20\d$/)
    cy.goToAdminListUsers()
    cy.getByDataTestid(`user-${newRole.users[0].id}`)
      .should('contain.text', newRole.name)
  })
})

describe('Administration roles, vérification en tant que nouvel admin', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/admin/roles').as('listAdminRoles')
    cy.intercept('DELETE', '/api/v1/admin/roles/*').as('deleteRole')

    cy.kcLogin('cnollet')
    cy.visit('/admin/roles')
    cy.url().should('contain', '/admin/roles')
    cy.wait('@listAdminRoles')
      .its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should remove oidc role', () => {
    cy.get('[data-testid$="-tab"]').contains(newOidcRole.name)
      .should('be.visible')
      .click()
    cy.getByDataTestid('deleteBtn')
      .should('be.enabled')
      .click()
    cy.getByDataTestid('confirmDeletionBtn')
      .should('be.enabled')
      .click()
    cy.wait('@deleteRole')
  })
})

describe('Administration roles', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/admin/roles').as('listAdminRoles')
    cy.intercept('DELETE', '/api/v1/admin/roles/*').as('deleteRole')

    cy.kcLogin('tcolin')
    cy.visit('/admin/roles')
    cy.url().should('contain', '/admin/roles')
    cy.wait('@listAdminRoles')
      .its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should remove non oidc role', () => {
    cy.get('[data-testid$="-tab"]').contains(newRole.name)
      .should('be.visible')
      .click()
    cy.getByDataTestid('deleteBtn')
      .should('be.enabled')
      .click()
    cy.getByDataTestid('confirmDeletionBtn')
      .should('be.enabled')
      .click()
    cy.wait('@deleteRole')
    cy.goToAdminListUsers()
    cy.getByDataTestid(`user-${newRole.users[0].id}`)
      .should('not.contain.text', newRole.name)
  })
})
