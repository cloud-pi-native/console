import { getModelById } from '../support/func.js'

describe('Manage project environments', () => {
  const project0 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38c5')
  const project1 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const clusterPublic = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const clusterPrivate = getModelById('cluster', 'aaaaaaaa-5b03-45d5-847b-149dec875680')
  const clusterSecret = getModelById('cluster', '126ac57f-263c-4463-87bb-d4e9017056b2')
  const quotaSmall = getModelById('quota', '5a57b62f-2465-4fb6-a853-5a751d099199')
  const quotaMedium = getModelById('quota', '08770663-3b76-4af6-8978-9f75eda4faa7')
  const devStage = getModelById('stage', '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9')
  const publicZone = getModelById('zone', 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
  const privateZone = getModelById('zone', 'a66c4230-eba6-41f1-aae5-bb1e4f90cce1')
  const integrationStage = getModelById('stage', 'd434310e-7850-4d59-b47f-0772edf50582')
  const stagingStage = getModelById('stage', '38fa869d-6267-441d-af7f-e0548fd06b7e')
  const project1FirstEnvironment = project1.environments[0]
  project1FirstEnvironment.cluster = getModelById('cluster', project1FirstEnvironment?.clusterId)
  project1FirstEnvironment.quota = getModelById('quota', project1FirstEnvironment?.quotaId)
  project1FirstEnvironment.stage = getModelById('stage', project1FirstEnvironment?.stageId)
  const projectFailed = getModelById('project', '83833faf-f654-40dd-bcd5-cf2e944fc702')
  const environments = [
    {
      name: 'integtest',
      zone: publicZone,
      stage: integrationStage,
      quota: quotaSmall,
      cluster: clusterPublic,
    },
    {
      name: 'stagetest',
      zone: publicZone,
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

  it('Should not create an environment if project + cluster + name is already taken', () => {
    cy.kcLogin('test')

    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', 'api/v1/stages').as('listStages')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('POST', '/api/v1/environments').as('postEnvironment')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('getProjects')

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project0?.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getClusters')

    cy.getByDataTestid('addEnvironmentLink').click()
    cy.wait('@listStages')
    cy.wait('@listQuotas')
    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentNameInput')
      .type('myenv')
    cy.get('#zone-select')
      .select(environments[1]?.zone?.id)
    cy.get('#stage-select')
      .select(environments[1]?.stage?.id)
    cy.get('#quota-select')
      .select(environments[1]?.quota?.id)
    cy.get('#cluster-select')
      .select(environments[1]?.cluster?.id)
    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.enabled')
    cy.getByDataTestid('environmentNameInput')
      .clear()
      .type('Inc0rr3ct/N4-m3!')
    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.disabled')
    cy.getByDataTestid('environmentNameInput')
      .clear()
      .type(environments[1]?.name)
    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.enabled')
      .click()

    cy.wait('@postEnvironment').its('response.statusCode').should('not.match', /^20\d$/)
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Un environnement avec le même nom et déployé sur le même cluster existe déjà pour ce projet.')
    })
  })

  it('Should handle cluster availability', () => {
    cy.kcLogin('test')

    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('GET', 'api/v1/quotas').as('listStages')

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project0?.name}`)
      .click()
    cy.getByDataTestid('menuEnvironments')
      .click()
    cy.url().should('contain', '/environments')
    cy.wait('@getClusters')

    cy.getByDataTestid('addEnvironmentLink').click()
    cy.wait('@listQuotas')
    cy.wait('@listStages')

    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentNameInput')
      .type('myenv')
    cy.get('#zone-select')
      .select(publicZone?.id)
    cy.get('#stage-select')
      .select(integrationStage?.id)
    cy.get('#quota-select')
      .select(quotaMedium?.id)
    cy.get('#cluster-select')
      .should('exist')
    cy.getByDataTestid('noClusterOptionAlert')
      .should('not.exist')

    cy.get('#cluster-select')
      .select(1)
    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.enabled')

    cy.get('#zone-select')
      .select(privateZone?.id)
    cy.get('#cluster-select')
      .should('not.exist')
    cy.getByDataTestid('noClusterOptionAlert')
      .should('exist')
    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.disabled')

    cy.get('#zone-select')
      .select(publicZone?.id)
    cy.get('#cluster-select')
      .should('not.exist')
    cy.getByDataTestid('noClusterOptionAlert')
      .should('exist')

    cy.get('#stage-select')
      .select(devStage?.id)
    cy.get('#cluster-select')
      .should('exist')
    cy.getByDataTestid('noClusterOptionAlert')
      .should('not.exist')
  })

  it('Should display zone and cluster infos', () => {
    cy.kcLogin('test')

    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('GET', 'api/v1/quotas').as('listStages')

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project1?.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getClusters')

    cy.getByDataTestid('addEnvironmentLink').click()
    cy.wait('@listQuotas')
    cy.wait('@listStages')
    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentNameInput')
      .type('myenv')
    cy.get('#zone-select')
      .select(publicZone?.id)
    cy.getByDataTestid('chosenZoneDescription')
      .should('be.visible')
      .and('contain', publicZone?.description)
    cy.get('#stage-select')
      .select(devStage?.id)
    cy.getByDataTestid('clusterInfos')
      .should('not.exist')
    cy.get('#cluster-select')
      .select(clusterPublic.id)
    cy.getByDataTestid('clusterInfos')
      .should('be.visible')
      .and('contain', clusterPublic.infos)
    cy.get('#cluster-select')
      .select(clusterPrivate.id)
    cy.getByDataTestid('clusterInfos')
      .should('be.visible')
      .and('contain', clusterPrivate.infos)
    cy.get('#cluster-select')
      .select(clusterSecret.id)
    cy.getByDataTestid('clusterInfos')
      .should('not.exist')
  })

  it('Should update an environment quota', () => {
    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', '/api/v1/stages').as('listStages')
    cy.intercept('GET', '/api/v1/environments?projectId=*').as('listEnvironments')
    cy.intercept('PUT', '/api/v1/environments/*').as('putEnvironment')

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@listEnvironments').its('response.statusCode').should('match', /^20\d$/)
    cy.wait('@getClusters').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`environmentTile-${project1FirstEnvironment.name}`).click()
    cy.wait('@listStages')
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', project1FirstEnvironment.name)
      .and('be.disabled')
    cy.get('#stage-select')
      .should('have.value', project1FirstEnvironment.stageId)
      .and('be.disabled')
    cy.get('#cluster-select')
      .should('have.value', project1FirstEnvironment.clusterId)
      .and('be.disabled')
    cy.get('#quota-select')
      .should('have.value', project1FirstEnvironment.quotaId)
      .and('be.enabled')
      .select(quotaSmall?.id)
    cy.getByDataTestid('putEnvironmentBtn').click()

    cy.wait('@putEnvironment').its('response.statusCode').should('match', /^20\d$/)
    cy.wait('@listEnvironments').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`environmentTile-${project1FirstEnvironment.name}`).click()
    cy.getByDataTestid('environmentNameInput')
      .should('have.value', project1FirstEnvironment.name)
      .and('be.disabled')
    cy.get('#stage-select')
      .should('have.value', project1FirstEnvironment.stageId)
      .and('be.disabled')
    cy.get('#cluster-select')
      .should('have.value', project1FirstEnvironment.clusterId)
      .and('be.disabled')
    cy.get('#quota-select')
      .should('have.value', quotaSmall.id)
      .and('be.enabled')
  })

  it('Should delete an environment', () => {
    cy.kcLogin('test')
    cy.deleteEnvironment(project0, environments[1]?.name)
  })

  it('Should not be able to delete an environment if not owner', () => {
    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', '/api/v1/stages').as('listStages')
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
    cy.wait('@getClusters')
    cy.getByDataTestid(`environmentTile-${project1FirstEnvironment?.name}`)
      .click()
    cy.wait('@listStages')
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })

  it('Should not be able to delete an environment if project locked', () => {
    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', '/api/v1/stages').as('listStages')

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${projectFailed.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.getByDataTestid(`environmentTile-${projectFailed.environments[0].name}`).click()
    cy.wait('@getClusters')
    cy.wait('@listStages')

    cy.getByDataTestid('showDeleteEnvironmentBtn').should('be.disabled')
  })
})
