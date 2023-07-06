import { getModel, getModelById } from '../support/func.js'

describe('Manage project environments', () => {
  const project0 = { name: 'project11' }
  const project1 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const environments = ['prod', 'staging']
  const clusters = getModel('cluster')

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project0)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project0.name}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should add environments to an existing project', () => {
    cy.addEnvironment(project0, environments)
    cy.assertAddEnvironment(project0, environments)
  })

  it('Should update an environment', () => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getAllClusters')
    cy.intercept('PUT', '/api/v1/projects/*/environments/*').as('putEnvironment')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')

    let environments
    const cluster = clusters[0]

    cy.kcLogin('tcolin')
    cy.visit('/admin/clusters')
    cy.wait('@getAllClusters')
    cy.getByDataTestid(`clusterTile-${cluster.label}`)
      .click()
    cy.wait(1000)
    cy.get('select#multi-select')
      .select(project0.name)
      .getByDataTestid('updateClusterBtn')
      .click()

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project0.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getProjects').its('response').then(response => {
      environments = response.body.find(resProject => resProject.name === project0.name).environments

      cy.getByDataTestid(`environmentTile-${environments[0].name}`).click()
        .get('select#multi-select')
        .select(cluster.label)
      cy.getByDataTestid('putEnvironmentBtn').click()

      cy.wait('@putEnvironment').its('response.statusCode').should('eq', 200)
      cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

      cy.reload()
      cy.getByDataTestid(`environmentTile-${environments[0].name}`).click()
        .getByDataTestid(`${cluster.label}-tag`).should('exist')
    })
  })

  it('Should delete an environment', () => {
    cy.deleteEnvironment(project0, environments[1])
  })

  it('Should not be able to delete an environment if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${environments[0]}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })
})
