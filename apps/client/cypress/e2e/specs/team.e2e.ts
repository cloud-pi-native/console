import { getModelById } from '../support/func.js'

const project = getModelById('project', '22e7044f-8414-435d-9c4a-2df42a65034b')
const newMember = getModelById('user', '89e5d1ca-3194-4b0a-b226-75a5f4fe6a34')

describe('Team view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display team members', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.slug}`).click()
      .getByDataTestid('test-tab-team').click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1)
  })

  it('Should not add a non-existing team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.slug}`).click()
      .getByDataTestid('test-tab-team').click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1)

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type('jenexistepas@criseexistentielle.com')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()

    cy.getByDataTestid('snackbar').should('contain', 'Utilisateur introuvable')

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1)
  })

  it('Should add a team member', () => {
    cy.intercept('POST', `api/v1/projects/${project.id}/members`).as('addUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.slug}`).click()
    cy.getByDataTestid('test-tab-team').click()
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1)

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type('test@test.com')
    cy.getByDataTestid('userErrorInfo')
      .should('contain', 'L\'utilisateur associé à cette adresse e-mail fait déjà partie du projet.')
    cy.getByDataTestid('addUserBtn')
      .should('be.disabled')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(newMember.email)
    cy.getByDataTestid('userErrorInfo')
      .should('not.exist')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1 + 1)
  })

  it('Should transfert owner role to a team member', () => {
    const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
    const userToTransfer = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')

    cy.intercept('PUT', `/api/v1/projects/${project.id}`).as('transferOwnership')
    cy.intercept('GET', `/api/v1/projects?filter=member&statusNotIn=archived`).as('getProjectMembers')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.slug}`).click()
    cy.getByDataTestid('test-tab-team').click()

    cy.getByDataTestid('showTransferProjectBtn')
      .should('be.enabled')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn').click()
    cy.getByDataTestid('transferProjectBtn')
      .should('exist')
      .should('be.disabled')
    cy.get('#nextOwnerSelect').select(userToTransfer.id)
    cy.getByDataTestid('transferProjectBtn')
      .should('be.enabled')
      .click()
    cy.wait('@transferOwnership')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.wait('@getProjectMembers')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')

    cy.kcLogin((userToTransfer.firstName.slice(0, 1) + userToTransfer.lastName).toLowerCase())

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.slug}`).click()
    cy.getByDataTestid('test-tab-team').click()

    cy.getByDataTestid('showTransferProjectBtn').click()
    cy.getByDataTestid('transferProjectBtn')
      .should('exist')
      .should('be.disabled')
    cy.get('#nextOwnerSelect').select(owner.id)
    cy.getByDataTestid('transferProjectBtn')
      .should('be.enabled')
      .click()
    cy.wait('@transferOwnership')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.wait('@getProjectMembers')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')
  })

  it('Should remove a team member', () => {
    cy.intercept('DELETE', `api/v1/projects/${project.id}/members/*`).as('removeUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.slug}`).click()
    cy.getByDataTestid('test-tab-team').click()
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1 + 1)
      .get(`td[title="Retirer ${newMember.email} du projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.members.length + 1)
  })
})
