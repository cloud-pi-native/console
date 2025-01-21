describe('Create Project', () => {
  const project = {
    name: 'project01',
    slug: 'project01',
    description: 'Application de prise de rendez-vous en préfécture.',
  }

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .get('h1').should('contain', 'Commander un espace projet')
      .get('[data-testid^="repoFieldset-"]').should('not.exist')

    cy.getByDataTestid('nameInput').type(`${project.name} ErrorSpace`)
      .getByDataTestid('nameInput').should('have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.disabled')
      .getByDataTestid('nameInput').clear().type(project.name)
      .getByDataTestid('nameInput').should('not.have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.enabled')
      .getByDataTestid('descriptionInput').clear().type(project.description)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

    cy.wait('@postProject').its('response.statusCode').should('match', /^20\d$/)
    cy.url().should('match', /projects\/.*\/dashboard/)

    cy.wait('@listProjects').its('response.statusCode').should('match', /^20\d$/)

    cy.assertCreateProjects([project.slug])
  })

  it('Should not create a project if name is already taken', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .getByDataTestid('nameInput').type(project.name)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()
    cy.wait('@postProject').its('response.statusCode').should('match', /^20\d$/)
    cy.url().should('contain', `/projects/${project.slug}-1/dashboard`)
  })
})
