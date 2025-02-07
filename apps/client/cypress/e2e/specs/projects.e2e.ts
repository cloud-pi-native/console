import { getModelById, getProjectMembers } from '../support/func.js'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569')
const secondUserProjects = getProjectMembers('cb8e5b4b-7b7b-40f5-935f-594f48ae6569')

describe('Projects view', () => {
  it('Should display select and button to create project', () => {
    cy.kcLogin('test')
    cy.intercept('GET', 'api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
    cy.intercept('GET', '/api/v1/stages').as('listStages')

    cy.goToProjects()
      .wait('@listProjects').its('response').then((response) => {
        cy.log(response?.body.length)
          .get('[data-testid^="projectTile-"]')
          .should('have.length', `${response?.body.length}`)
      })
      .getByDataTestid(`projectTile-${project.slug}`).click()
      .url().should('contain', `projects/${project.slug}`)
    cy.wait('@listStages')
    cy.getByDataTestid('descriptionP')
    cy.should('contain', project.description)
  })
  it('Should display only projects that user is member of', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
    cy.intercept('GET', 'api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
    cy.goToProjects()
      .wait('@listProjects').its('response').then((_response) => {
        cy.get('[data-testid^="projectTile-"]')
          .should('have.length', `${secondUserProjects.length}`)
      })
  })
})
