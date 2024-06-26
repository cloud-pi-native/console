import { ClusterPrivacy } from '@cpn-console/shared'
import { getModelById, getModel } from '../../support/func.js'

describe('Administration clusters', () => {
  const clusters = getModel('cluster')
  const cluster1 = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const cluster2 = getModelById('cluster', 'aaaaaaaa-5b03-45d5-847b-149dec875680')
  const allStages = getModel('stage')
  const allProjects = getModel('project')
  const privateZone = getModelById('zone', 'a66c4230-eba6-41f1-aae5-bb1e4f90cce1')

  let allClusters

  const newCluster = {
    label: 'newCluster',
    projects: allProjects.slice(0, 1),
    stages: allStages.map(stage => stage.id),
    infos: 'Floating IP: 1.1.1.1',
    cluster: {
      tlsServerName: 'myTlsServerName',
    },
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getClusters')
    cy.intercept('GET', '/api/v1/admin/projects').as('getAdminProjects')
    cy.intercept('GET', '/api/v1/stages').as('getStages')

    cy.kcLogin('tcolin')
    cy.visit('/admin/clusters')
    cy.url().should('contain', '/admin/clusters')
    cy.wait('@getClusters').its('response').then(response => {
      allClusters = response?.body
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
    cy.wait('@getAdminProjects').its('response.statusCode').should('match', /^20\d$/)
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
    cy.get('#zone-select')
      .should('exist')
      .and('be.enabled')
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
    cy.get('#zone-select')
      .should('exist')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', ClusterPrivacy.DEDICATED)
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
    cy.get('#zone-select')
      .select(privateZone.id)

    cy.get('#privacy-select')
      .select(ClusterPrivacy.DEDICATED)
    cy.get('#projects-select')
      .click()
    newCluster.projects.forEach(project => {
      cy.getByDataTestid(`${project.id}-projects-select-tag`)
        .click()
    })
    cy.get('#projects-select .fr-tag--dismiss')
      .should('have.length', newCluster.projects.length)

    newCluster.stages.forEach(stage => {
      cy.getByDataTestid(`${stage}-stages-select-tag`)
        .click()
    })
    cy.get('[data-testid$="stages-select-tag"]')
      .get('#stages-select .fr-tag--dismiss')
      .should('have.length', newCluster.stages.length)
    cy.getByDataTestid('addClusterBtn')
      .should('be.enabled')
      .click()
    cy.wait('@createCluster')
      .its('response.statusCode').should('match', /^20\d$/)

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
    cy.get('#zone-select')
      .should('have.value', privateZone.id)
    cy.get('#privacy-select')
      .should('have.value', ClusterPrivacy.DEDICATED)
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

    const updatedCluster = {
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
      .type(updatedCluster.cluster.tlsServerName)
    cy.getByDataTestid('labelInput')
      .should('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .clear()
      .type(updatedCluster.infos)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.enabled')
      .uncheck({ force: true })
    cy.get('#zone-select')
      .should('have.value', privateZone.id)
      .select('a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
    cy.get('#privacy-select')
      .select('public')

    cy.get('#stages-select')
      .click()
    cy.get(`[data-testid="${allStages[0].id}-stages-select-tag"]`)
      .click()
    cy.get('#stages-select .fr-tag--dismiss')
      .should('have.length', newCluster.stages.length - 1)
    cy.getByDataTestid('updateClusterBtn')
      .should('be.enabled')
      .click()
    cy.wait('@updateCluster')
      .its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`clusterTile-${newCluster.label}`)
      .should('be.visible')
      .click()
    cy.get('h1')
      .should('contain', 'Mettre à jour le cluster')
    cy.get('div.json-box')
      .should('have.length', 2)
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', newCluster.label)
      .and('be.disabled')
    cy.getByDataTestid('infosInput')
      .find('textarea')
      .should('have.value', updatedCluster.infos)
    cy.getByDataTestid('tlsServerNameInput')
      .find('input')
      .should('have.value', updatedCluster.cluster.tlsServerName)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'public')
      .and('be.enabled')
    cy.get('#projects-select')
      .should('not.exist')
    cy.get('#zone-select')
      .should('have.value', 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
    cy.get('#stages-select')
      .should('exist')
    cy.get('#stages-select')
      .click()
    cy.get('#stages-select .fr-tag--dismiss')
      .should('have.length', newCluster.stages.length - 1)
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
      .its('response.statusCode').should('match', /^20\d$/)
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
