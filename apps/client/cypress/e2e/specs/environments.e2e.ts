import { getModelById } from '../support/func'

describe('Manage project environments', () => {
  const project0 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38c5')
  const project1 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const clusterPublic = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const cluster = getModelById('cluster', '126ac57f-263c-4463-87bb-d4e9017056b2')
  const quotaSmall = getModelById('quota', '5a57b62f-2465-4fb6-a853-5a751d099199')
  const quotaMedium = getModelById('quota', '08770663-3b76-4af6-8978-9f75eda4faa7')
  const integrationStage = getModelById('stage', 'd434310e-7850-4d59-b47f-0772edf50582')
  const stagingStage = getModelById('stage', '38fa869d-6267-441d-af7f-e0548fd06b7e')
  const project1FirstEnvironment = project1.environments[0]
  const project1EnvQuotaStage = getModelById('quotaStage', project1FirstEnvironment?.quotaStageId)
  project1FirstEnvironment.quota = getModelById('quota', project1EnvQuotaStage?.quotaId)
  project1FirstEnvironment.stage = getModelById('stage', project1EnvQuotaStage?.stageId)
  const environments = [
    {
      name: 'integ-test',
      stage: integrationStage,
      quota: quotaSmall,
      cluster: clusterPublic,
    },
    {
      name: 'stage-test',
      stage: stagingStage,
      quota: quotaMedium,
      cluster: clusterPublic,
    },
  ]

  it('Should add environments to an existing project', () => {
    cy.kcLogin('test')
    cy.addEnvironment(project0, environments)
    cy.assertAddEnvironment(project0, environments)
  })

  // TODO
  it('Should test environmentForm validation', () => {
    cy.kcLogin('test')
    // cy.addEnvironment(project0, environments)
    // cy.assertAddEnvironment(project0, environments)
  })

  it('Should update an environment quota', () => {
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
    cy.getByDataTestid(`clusterTile-${cluster.label}`)
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

    cy.getByDataTestid(`environmentTile-${project1FirstEnvironment?.name}`).click()
    cy.get('#quota-select')
      .should('have.value', project1FirstEnvironment?.quota?.id)
      .select(quotaSmall?.id)
    cy.getByDataTestid('putEnvironmentBtn').click()

    cy.wait('@putEnvironment').its('response.statusCode').should('eq', 200)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

    cy.reload()
    cy.getByDataTestid(`environmentTile-${project1FirstEnvironment?.name}`).click()
    cy.get('#quota-select')
      .should('have.value', quotaSmall?.id)
  })

  it('Should delete an environment', () => {
    cy.kcLogin('test')
    cy.deleteEnvironment(project0, environments[1]?.name)
  })

  it('Should not be able to delete an environment if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${project1FirstEnvironment?.name}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })
})
