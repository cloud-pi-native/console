import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

describe('Projects view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display select and button to create project', () => {
    cy.intercept('GET', 'api/v1/projects').as('getProjects')

    cy.goToProjects()
      .wait('@getProjects').its('response').then(response => {
        cy.log(response.body.length)
          .get('[data-testid^="projectTile-"]')
          .should('have.length', `${response.body.length}`)
      })
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .url().should('contain', `projects/${candilib.id}/dashboard`)
      .getByDataTestid('currentProjectInfo')
      .should('contain', `Le projet courant est : ${candilib.projectName}`)
  })
})
