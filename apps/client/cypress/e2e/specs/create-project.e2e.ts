import { getModelById } from '../support/func'

describe('Create Project', () => {
  const project = {
    orgName: 'mi',
    name: 'project01',
    description: 'Application de prise de rendez-vous en préfécture.',
  }

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')

    const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .get('h1').should('contain', 'Commander un espace projet')
      .get('[data-testid^="repoFieldset-"]').should('not.exist')
      .get('p.fr-alert__description').should('contain', owner.email)
      .get('select#organizationId-select').select(project.orgName)
      .getByDataTestid('nameInput').find('input').type(`${project.name} ErrorSpace`)
      .getByDataTestid('nameInput').should('have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.disabled')
      .getByDataTestid('nameInput').find('input').clear().type(project.name)
      .getByDataTestid('nameInput').should('not.have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.enabled')
      .getByDataTestid('descriptionInput').clear().type(project.description)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

    cy.wait('@postProject').its('response.statusCode').should('eq', 201)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

    cy.assertCreateProjects([project.name])
  })

  it('Should not create a project if name is already taken', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .get('select#organizationId-select').select(project.orgName)
      .getByDataTestid('nameInput').find('input').type(`${project.name}`)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

    cy.wait('@postProject').its('response.statusCode').should('eq', 400)
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Le projet "${project.name}" existe déjà`)
    })
  })
})
