import { getModel, getModelById } from '../support/func'

describe('Manage project environments', () => {
  const project0 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38c5')
  const project1 = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const environments = ['integration', 'staging']
  const cluster0 = getModelById('cluster', '126ac57f-263c-4463-87bb-d4e9017056b2')
  const cluster1 = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const quotaMicro = getModelById('quota', '7fd7e4ac-2638-4d8a-8a77-b823dd7de8ed')
  const quotaSmall = getModelById('quota', '74b8e2e3-3c49-4d74-9cd2-06232ebcd5cf')
  const stages = getModel('stage')
  const project1FirstEnvironmentName = stages.find(stage => stage.id === project1.environments[0].stageId).name

  it('Should add environments to an existing project', () => {
    cy.kcLogin('test')
    cy.addEnvironment(project0, environments)
    cy.assertAddEnvironment(project0, environments)
  })

  it('Should create an environment with minimum quota by default', () => {
    cy.intercept('GET', '/api/v1/projects/environments/dso-environments').as('getStages')
    cy.intercept('POST', '/api/v1/projects/*/environments').as('postEnvironment')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    const env = 'dev'

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project0.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getStages').its('response.statusCode').should('eq', 200)

    cy.getByDataTestid('addEnvironmentLink').click()
      .get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('quotasLevelRange')
      .should('not.exist')
    cy.get('select#environment-name-select')
      .select(env)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 0)

    cy.getByDataTestid('addEnvironmentBtn').click()
    cy.wait('@postEnvironment').its('request.body').then(body => {
      cy.log(JSON.stringify(body))
      expect(JSON.stringify(body)).equal(JSON.stringify({
        projectId: project0.id,
        quotaId: quotaMicro.id,
        stageId: stages.find(stage => stage.name === env).id,
      }))
    })

    cy.reload()
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`environmentTile-${env}`).should('exist')
      .click()
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 0)

    cy.deleteEnvironment(project0, env)
  })

  it('Should create an environment with defined quota', () => {
    cy.intercept('GET', '/api/v1/projects/environments/dso-environments').as('getStages')
    cy.intercept('POST', '/api/v1/projects/*/environments').as('postEnvironment')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    const env = 'dev'

    cy.kcLogin('test')
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project0.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .url().should('contain', '/environments')
    cy.wait('@getStages').its('response.statusCode').should('eq', 200)

    cy.getByDataTestid('addEnvironmentLink').click()
      .get('h1').should('contain', 'Ajouter un environnement au projet')
      .get('select#environment-name-select')
      .select(env)

    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 0)
    cy.get('datalist#rangeList')
      .find('option')
      .should('have.length', 2)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .invoke('val', 1)
      .trigger('input')
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 1)

    cy.getByDataTestid('addEnvironmentBtn')
      .should('be.enabled')
      .click()
    cy.wait('@postEnvironment').its('request.body').then(body => {
      cy.log(JSON.stringify(body))
      expect(JSON.stringify(body)).equal(JSON.stringify({
        projectId: project0.id,
        quotaId: quotaSmall.id,
        stageId: stages.find(stage => stage.name === env).id,
      }))
    })

    cy.reload()
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`environmentTile-${env}`).should('exist')
      .click()
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 1)

    cy.deleteEnvironment(project0, env)
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

    cy.getByDataTestid(`environmentTile-${project1FirstEnvironmentName}`).click()
      .get('#multi-select')
      .select(cluster0.label)
      .select(cluster1.label)
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .invoke('val', 1)
      .trigger('input')
    cy.getByDataTestid('putEnvironmentBtn').click()

    cy.wait('@putEnvironment').its('response.statusCode').should('eq', 200)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

    cy.reload()
    cy.getByDataTestid(`environmentTile-${project1FirstEnvironmentName}`).click()
    cy.getByDataTestid(`${cluster0.label}-tag`).should('exist')
    cy.getByDataTestid(`${cluster1.label}-tag`).should('exist')
    cy.getByDataTestid('quotasLevelRange')
      .find('input[type=range]')
      .should('have.value', 1)
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
      .getByDataTestid(`environmentTile-${project1FirstEnvironmentName}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })
})
