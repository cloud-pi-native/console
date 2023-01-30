import { getProjectbyId, getUserProjects } from '../support/func.js'

const project = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')
const secondUserProjects = getUserProjects('cb8e5b4b-7b7b-40f5-935f-594f48ae6566')

describe('Projects view', () => {
  it('Should display select and button to create project', () => {
    cy.kcLogin('test')
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
  it('Should display only projects that user is member of', () => {
    cy.kcLogin('tcolin')
    cy.intercept('GET', 'api/v1/projects').as('getProjects')
    cy.goToProjects()
      .wait('@getProjects').its('response').then(response => {
        cy.log(response.body.length)
          .get('[data-testid^="projectTile-"]')
          .should('have.length', `${secondUserProjects.length}`)
      })
  })
})
