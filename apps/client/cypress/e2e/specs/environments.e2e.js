import { getModelById } from '../support/func.js'

describe('Manage project environments', () => {
  const project0 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38c5')
  const project1 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const environments = ['integration', 'staging']
  const cluster0 = getModelById('cluster', '126ac57f-263c-4463-87bb-d4e9017056b2')
  const cluster1 = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')

  it('Should add environments to an existing project', () => {
    cy.kcLogin('test')
    cy.addEnvironment(project0, environments)
    cy.assertAddEnvironment(project0, environments)
  })

  it('Should update an environment', () => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getAllClusters')
    cy.intercept('PUT', '/api/v1/projects/*/environments/*').as('putEnvironment')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    cy.intercept('GET', '/api/v1/admin/projects').as('getAdminProjects')

    cy.kcLogin('tcolin')
    cy.visit('/')
      .getByDataTestid('menuAdministrationBtn').click()
      .getByDataTestid('menuAdministrationClusters').click()
      .url().should('contain', '/admin/clusters')
    cy.wait('@getAllClusters').its('response.statusCode').should('eq', 200)
    cy.wait('@getAdminProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`clusterTile-${cluster0.label}`)
      .click()
    cy.get('#multi-select')
      .select(`${project0.organization.name} - ${project0.name}`)
      .getByDataTestid('updateClusterBtn')
      .click()

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

    cy.getByDataTestid(`environmentTile-${project1.environments[0].name}`).click()
      .get('#multi-select')
      .select(cluster0.label)
      .select(cluster1.label)
    cy.getByDataTestid('putEnvironmentBtn').click()

    cy.wait('@putEnvironment').its('response.statusCode').should('eq', 200)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

    cy.reload()
    cy.getByDataTestid(`environmentTile-${project1.environments[0].name}`).click()
      .getByDataTestid(`${cluster0.label}-tag`).should('exist')
      .getByDataTestid(`${cluster1.label}-tag`).should('exist')
  })

  it('Should delete an environment', () => {
    cy.kcLogin('test')
    cy.deleteEnvironment(project0, environments[1])
  })

  it('Should not be able to delete an environment if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${project1.environments[0].name}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })
})
