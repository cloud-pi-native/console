import { getModelById, getModel } from '../../support/func.js'

describe('Administration clusters', () => {
  const clusters = getModel('cluster')
  const cluster1 = getModelById('cluster', '32636a52-4dd1-430b-b08a-b2e5ed9d1789')
  const cluster2 = getModelById('cluster', 'aaaaaaaa-5b03-45d5-847b-149dec875680')

  let allClusters

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/clusters').as('getAllClusters')
    cy.intercept('GET', '/api/v1/admin/projects').as('getAdminProjects')

    cy.kcLogin('tcolin')
    cy.visit('/admin/clusters')
    cy.url().should('contain', '/admin/clusters')
    cy.wait('@getAllClusters').its('response').then(response => {
      allClusters = response.body
      cy.log(allClusters)
    })
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
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'public')
      .and('be.enabled')
    cy.get('#multi-select')
      .should('not.exist')
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
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'dedicated')
      .and('be.enabled')
    cy.get('#multi-select')
      .should('be.visible')
    cy.get('button.fr-tag')
      .should('have.length', cluster2Infos.projectsId?.length)
  })

  it('Should create a cluster', () => {
    cy.intercept('POST', '/api/v1/admin/clusters').as('createCluster')
    const newCluster = {
      label: 'newCluster',
      projects: ['dinum - beta-app'],
    }

    cy.getByDataTestid('addClusterLink')
      .click()
    cy.get('h1')
      .should('contain', 'Ajouter un cluster')
    cy.getByDataTestid('addClusterBtn')
      .should('be.disabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(newCluster.label)
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.enabled')
      .check({ force: true })
    cy.get('#privacy-select')
      .select('dedicated')
    newCluster.projects.forEach(project => {
      cy.get('#multi-select')
        .select(project)
    })
    cy.get('button.fr-tag')
      .should('have.length', newCluster.projects.length)
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
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', newCluster.label)
      .and('be.disabled')
    cy.getByDataTestid('clusterResourcesCbx')
      .find('input')
      .should('be.checked')
      .and('be.enabled')
    cy.get('#privacy-select')
      .should('have.value', 'dedicated')
      .and('be.enabled')
    cy.get('#multi-select')
      .should('be.visible')
    cy.get('button.fr-tag')
      .should('have.length', newCluster.projects.length)
  })
})
