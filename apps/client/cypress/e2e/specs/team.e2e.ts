import { getModelById } from '../support/func.js'

const project = getModelById('project', '22e7044f-8414-435d-9c4a-2df42a65034b')
const newMember = getModelById('user', '89e5d1ca-3194-4b0a-b226-75a5f4fe6a34')

describe('Team view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display team members', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })

  it('Should not add a non-existing team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)

    cy.getByDataTestid('addUserSuggestionInput').find('input')
      .clear()
      .type('jenexistepas@criseexistentielle.com')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()

    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Utilisateur introuvable')
    })

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })

  it('Should add a team member', () => {
    cy.intercept('POST', `api/v1/projects/${project.id}/users`).as('addUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)

    cy.getByDataTestid('addUserSuggestionInput').find('input')
      .clear()
      .type('test@test.com')
    cy.getByDataTestid('userErrorInfo')
      .should('contain', 'L\'utilisateur associé à cette adresse e-mail fait déjà partie du projet.')
    cy.getByDataTestid('addUserBtn')
      .should('be.disabled')
    cy.getByDataTestid('addUserSuggestionInput').find('input')
      .clear()

    cy.getByDataTestid('addUserSuggestionInput').find('input')
      .clear()
      .type(newMember.email)
    cy.getByDataTestid('userErrorInfo')
      .should('not.exist')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('eq', 201)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
  })

  it('Should remove a team member', () => {
    cy.intercept('DELETE', `api/v1/projects/${project.id}/users/*`).as('removeUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
      .get(`td[title="retirer ${newMember.email} du projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('eq', 200)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })
})
