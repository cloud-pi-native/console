import { getProjectbyId } from '../support/func.js'

const project = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')

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
      .getByDataTestid(`projectTile-${project.name}`).click()
      .url().should('contain', `projects/${project.id}/dashboard`)
      .getByDataTestid('currentProjectInfo')
      .should('contain', `Le projet courant est : ${project.name}`)
  })
})
