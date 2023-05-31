import { getModelById } from '../support/func.js'

const project = getModelById('projects', '22e7044f-8414-435d-9c4a-2df42a65034b')
const newMember = getModelById('users', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567')

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

  // TODO : #66
  it.skip('Should add a team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
      .getByDataTestid('addUserInput').clear()
      .type('test@test.com')
      .getByDataTestid('userErrorInfo')
      .should('contain', 'L\'utilisateur associé à cette adresse e-mail fait déjà partie du projet.')
      .getByDataTestid('addUserBtn')
      .should('be.disabled')
      .getByDataTestid('addUserInput').clear()
      .type(newMember.email)
      .getByDataTestid('userErrorInfo')
      .should('not.exist')
      .getByDataTestid('addUserBtn')
      .should('be.enabled').click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
  })

  it.skip('Should remove a team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
      .get(`td[title="retirer ${newMember.email} du projet"]`)
      .click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })
})
