import { getModelById, getModel } from '../../support/func'

describe('Administration clusters', () => {
  const clusters = getModel('cluster')
  const cluster1 = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const cluster2 = getModelById('cluster', 'aaaaaaaa-5b03-45d5-847b-149dec875680')
  const allStages = getModel('stage')

  let allClusters

  const newCluster = {
    label: 'newCluster',
    projects: ['dinum - beta-app'],
    stages: allStages.map(stage => stage.name),
    infos: 'Floating IP: 1.1.1.1',
    cluster: {
      tlsServerName: 'myTlsServerName',
      server: 'my.super.cluster',
    },
    user: {},
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getAdminClusters')
    cy.intercept('GET', '/api/v1/admin/projects').as('getAdminProjects')
    cy.intercept('GET', '/api/v1/stages').as('getStages')

    cy.kcLogin('tcolin')
    cy.visit('/admin/clusters')
    cy.url().should('contain', '/admin/clusters')
    cy.wait('@getAdminClusters').its('response').then(response => {
      allClusters = response.body
      cluster1.stages = allClusters
        .find(cluster => cluster.id === cluster1.id)
        ?.stageIds
        ?.map(stageId => allStages
          ?.find(stage => stage.id === stageId))
      cluster2.stages = allClusters
        .find(cluster => cluster.id === cluster2.id)
        ?.stageIds
        ?.map(stageId => allStages
          ?.find(stage => stage.id === stageId))
    })
    cy.wait('@getStages')
    cy.wait('@getAdminProjects').its('response.statusCode').should('eq', 200)
  })

  it('Should display clusters list', () => {
    clusters?.forEach(cluster => {
      cy.getByDataTestid(`clusterTile-${cluster.label}`)
        .should('be.visible')
    })
  })

  it('Should display a public cluster form', () => {
    cy.getByDataTestid(`clusterTile-${cluster1.label}`)
      .should('be.visible')
      .click()
    cy.get('h1')
      .should('contain', 'Mettre à jour le cluster')
    cy.get('div.json-box')
      .should('have.length', 2)
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', cluster1.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', cluster1.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'public')
      .and('be.enabled')
    cy.get('#projects-select')
      .should('not.exist')
    cy.get('#stages-select')
      .should('exist')
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', cluster1.stages?.length)
  })

  it('Should display a dedicated cluster form', () => {
    const cluster2Infos = allClusters.find(cluster => cluster.label === cluster2.label)

    cy.getByDataTestid(`clusterTile-${cluster2.label}`)
      .should('be.visible')
      .click()
    cy.get('h1')
      .should('contain', 'Mettre à jour le cluster')
    cy.get('div.json-box')
      .should('have.length', 2)
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', cluster2.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', cluster2.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'dedicated')
      .and('be.enabled')
    cy.get('#projects-select')
      .should('be.visible')
    cy.get('[data-testid$="projects-select-tag"]')
      .should('have.length', cluster2Infos.projectIds?.length)
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', cluster2.stages?.length)
  })

  it('Should create a cluster', () => {
    cy.intercept('POST', '/api/v1/admin/clusters').as('createCluster')

    cy.getByDataTestid('addClusterLink')
      .click()
    cy.get('h1')
      .should('contain', 'Ajouter un cluster')
    cy.getByDataTestid('addClusterBtn')
      .should('be.disabled')
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .should('have.value', '')
      .type(newCluster.cluster.tlsServerName)
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(newCluster.label)
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .clear()
      .type(newCluster.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.enabled')
      .check({ force: true })
    cy.get('#privacy-select')
      .select('dedicated')
    newCluster.projects.forEach(project => {
      cy.get('#projects-select')
        .select(project)
    })
    cy.get('[data-testid$="projects-select-tag"]')
      .should('have.length', newCluster.projects.length)
    newCluster.stages.forEach(stage => {
      cy.get('#stages-select')
        .select(stage)
    })
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', newCluster.stages.length)
    cy.getByDataTestid('addClusterBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createCluster')
      .its('response.statusCode').should('eq', 201)

    cy.getByDataTestid(`clusterTile-${newCluster.label}`)
      .should('be.visible')
      .click()
    cy.get('h1')
      .should('contain', 'Mettre à jour le cluster')
    cy.get('div.json-box')
      .should('have.length', 2)
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .should('have.value', newCluster.cluster.tlsServerName)
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', newCluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', newCluster.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'dedicated')
      .and('be.enabled')
    cy.get('#projects-select')
      .should('be.visible')
    cy.get('[data-testid$="projects-select-tag"]')
      .should('have.length', newCluster.projects.length)
    cy.get('#stages-select')
      .should('be.visible')
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', newCluster.stages.length)
  })

  it('Should update a cluster', () => {
    cy.intercept('PUT', '/api/v1/admin/clusters/*').as('updateCluster')

    const updatedCLuster = {
      label: 'updatedCluster',
      infos: 'Floating IP: 2.2.2.2',
      cluster: {
        tlsServerName: 'updatedTlsServerName',
      },
    }

    cy.getByDataTestid(`clusterTile-${newCluster.label}`)
      .should('be.visible')
      .click()

    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .clear()
      .type(updatedCLuster.cluster.tlsServerName)
    cy.getByDataTestid('labelInput')
      .should('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .clear()
      .type(updatedCLuster.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.enabled')
      .uncheck({ force: true })
    cy.get('#privacy-select')
      .select('public')
    cy.get(`[data-testid="${allStages[0].name}-stages-select-tag"]`)
      .click()
    cy.get('[data-testid$="stages-select-tag"]')
      .should('have.length', newCluster.stages.length - 1)
    cy.getByDataTestid('updateClusterBtn')
      .should('be.enabled')
      .click()
    cy.wait('@updateCluster')
      .its('response.statusCode').should('eq', 200)
  })

  it('Should delete a cluster', () => {
    cy.intercept('DELETE', '/api/v1/admin/clusters/*').as('deleteCluster')

    cy.getByDataTestid(`clusterTile-${newCluster.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('associatedEnvironmentsZone').should('not.exist')
    cy.getByDataTestid('deleteClusterZone').should('exist')
    cy.getByDataTestid('showDeleteClusterBtn').click()
    cy.getByDataTestid('deleteClusterBtn').should('be.disabled')
    cy.getByDataTestid('deleteClusterInput')
      .clear()
      .type(newCluster.label)
    cy.getByDataTestid('deleteClusterBtn')
      .should('be.enabled')
      .click()
    cy.wait('@deleteCluster')
      .its('response.statusCode').should('eq', 204)
    cy.getByDataTestid(`clusterTile-${newCluster.label}`)
      .should('not.exist')
  })

  it('Should not delete a cluster if associated environments', () => {
    cy.getByDataTestid(`clusterTile-${cluster1.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('deleteClusterZone').should('not.exist')
    cy.getByDataTestid('associatedEnvironmentsZone').should('exist')
  })
})
