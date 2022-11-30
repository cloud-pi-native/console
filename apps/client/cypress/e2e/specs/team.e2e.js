import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

describe('Team view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display team members', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${candilib.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', 1)
  })

  it('Should add a team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${candilib.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', 1)
      .getByDataTestid('addUserInput').clear()
      .type('test@test.com')
      .getByDataTestid('userErrorInfo')
      .should('contain', 'L\'utilisateur associé à cette adresse e-mail fait déjà partie du projet.')
      .getByDataTestid('addUserBtn')
      .should('be.disabled')
      .getByDataTestid('addUserInput').clear()
      .type('test@test.fr')
      .getByDataTestid('userErrorInfo')
      .should('not.exist')
      .getByDataTestid('addUserBtn')
      .should('be.enabled').click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', 2)
  })

  it('Should remove a team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${candilib.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', 2)
      .get('td[title="retirer test@test.fr du projet"]')
      .click()
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', 1)
  })
})
