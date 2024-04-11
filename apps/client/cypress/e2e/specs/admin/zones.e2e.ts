import { getModel } from '../../support/func.js'

describe('Administration zones', () => {
  let zones
  const clusters = getModel('cluster')
  const newZone = {
    slug: 'zad',
    label: 'Zone à Défendre',
    description: 'Il faut défendre cette zone.',
    clusters,
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/zones').as('getZones')
    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('POST', 'api/v1/admin/zones').as('createZone')
    cy.intercept('PUT', 'api/v1/admin/zones/*').as('updateZone')
    cy.intercept('DELETE', 'api/v1/admin/zones/*').as('deleteZone')

    cy.kcLogin('tcolin')
    cy.visit('/admin/zones')
    cy.url().should('contain', '/admin/zones')
    cy.wait('@getZones').its('response').then(response => {
      zones = response?.body
    })
    cy.wait('@getClusters').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should display zones list', () => {
    zones?.forEach(zone => {
      cy.getByDataTestid(`zoneTile-${zone.label}`)
        .should('be.visible')
        .click()
      cy.getByDataTestid('slugInput')
        .find('input')
        .should('have.value', zone.slug)
        .and('be.disabled')
      cy.getByDataTestid('labelInput')
        .find('input')
        .should('have.value', zone.label)
        .and('be.enabled')
      cy.getByDataTestid('descriptionInput')
        .find('textarea')
        .should('have.value', zone.description)
        .and('be.enabled')
      cy.get('#clusters-select')
        .should('be.disabled')
      cy.get('[data-testid$="clusters-select-tag"]')
        .should('have.length', zone.clusters?.length ?? 0)
      cy.getByDataTestid('updateZoneBtn')
        .should('be.enabled')
      cy.getByDataTestid('cancelZoneBtn')
        .click()
    })
  })

  it('Should update a zone', () => {
    const zone = zones[0]
    const updatedZone = {
      label: 'Zone Mise à Jour',
      description: 'Cette zone a été mise à jour.',
    }
    cy.getByDataTestid(`zoneTile-${zone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .find('input')
      .should('have.value', zone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(updatedZone.label)
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .clear()
      .type(updatedZone.description)
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@updateZone').its('response.statusCode').should('match', /^20\d$/)

    cy.reload()
    cy.wait('@getZones').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`zoneTile-${updatedZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .find('input')
      .should('have.value', zone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', updatedZone.label)
      .and('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .should('have.value', updatedZone.description)
      .and('be.enabled')
    cy.get('#clusters-select')
      .should('be.disabled')
    cy.get('[data-testid$="clusters-select-tag"]')
      .should('have.length', zone.clusters?.length)
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
    cy.getByDataTestid('cancelZoneBtn')
      .click()

    cy.getByDataTestid(`zoneTile-${updatedZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(zone.label)
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .clear()
      .type(zone.description)
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@updateZone').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should create a zone', () => {
    cy.getByDataTestid('createZoneLink')
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .find('input')
      .clear()
      .type(newZone.slug)
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(newZone.label)
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .clear()
      .type(newZone.description)
    newZone.clusters.forEach((cluster) => {
      cy.get('#clusters-select')
        .select(cluster.label)
    })
    cy.getByDataTestid('addZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@createZone').its('response.statusCode').should('match', /^20\d$/)

    cy.reload()
    cy.wait('@getZones').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`zoneTile-${newZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .find('input')
      .should('have.value', newZone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .find('input')
      .should('have.value', newZone.label)
      .and('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .should('have.value', newZone.description)
      .and('be.enabled')
    cy.get('#clusters-select')
      .should('be.disabled')
    cy.get('[data-testid$="clusters-select-tag"]')
      .should('have.length', newZone.clusters.length)
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
    cy.getByDataTestid('cancelZoneBtn')
      .click()

    zones.forEach((zone) => {
      cy.getByDataTestid(`zoneTile-${zone.label}`)
        .should('be.visible')
        .click()
      cy.get('[data-testid$="clusters-select-tag"]')
        .should('have.length', 0)
      cy.getByDataTestid('cancelZoneBtn')
        .click()
    })
  })

  it('Should not create a zone if slug is already taken', () => {
    cy.getByDataTestid('createZoneLink')
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .find('input')
      .clear()
      .type(newZone.slug)
    cy.getByDataTestid('labelInput')
      .find('input')
      .clear()
      .type(newZone.label)
    cy.getByDataTestid('descriptionInput')
      .find('textarea')
      .clear()
      .type(newZone.description)
    newZone.clusters.forEach((cluster) => {
      cy.get('#clusters-select')
        .select(cluster.label)
    })
    cy.getByDataTestid('addZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@createZone').its('response.statusCode').should('match', /^40\d$/)
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Une zone portant le nom ${newZone.slug} existe déjà.`)
    })
  })

  it('Should not delete a zone if associated clusters', () => {
    cy.getByDataTestid(`zoneTile-${newZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('showDeleteZoneBtn')
      .should('not.exist')
    cy.getByDataTestid('associatedClustersAlert')
      .should('exist')
  })

  it('Should delete a zone', () => {
    cy.intercept('PUT', '/api/v1/admin/clusters/*').as('updateCluster')

    cy.visit('/admin/clusters')
    cy.url().should('contain', '/admin/clusters')
    cy.wait('@getClusters').its('response.statusCode').should('match', /^20\d$/)

    newZone.clusters.forEach((cluster) => {
      cy.getByDataTestid(`clusterTile-${cluster.label}`)
        .should('be.visible')
        .click()
      cy.get('#zone-select')
        .select('a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
      cy.getByDataTestid('updateClusterBtn')
        .should('be.enabled')
        .click()
      cy.wait('@updateCluster')
        .its('response.statusCode').should('match', /^20\d$/)
    })

    cy.visit('/admin/zones')
    cy.url().should('contain', '/admin/zones')
    cy.getByDataTestid(`zoneTile-${newZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('showDeleteZoneBtn')
      .click()
    cy.getByDataTestid('deleteZoneInput')
      .clear()
      .type(newZone.slug)
    cy.getByDataTestid('deleteZoneBtn')
      .click()

    cy.wait('@deleteZone').its('response.statusCode').should('match', /^20\d$/)
  })
})
