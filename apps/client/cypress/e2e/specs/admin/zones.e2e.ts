import type { Zone } from '@cpn-console/shared'
import { getModel } from '../../support/func.js'

describe('Administration zones', () => {
  let zones: Zone[]
  const clusters = getModel('cluster')
  const newZone = {
    slug: 'zad',
    label: 'Zone à Défendre',
    description: 'Il faut défendre cette zone.',
    // Ne font pas partie de la réponse d'API
    clusters,
    clusterIds: clusters.map(({ id }) => id),
  }

  beforeEach(() => {
    cy.intercept('GET', '/api/v1/zones').as('listZones')
    cy.intercept('GET', '/api/v1/clusters').as('getClusters')
    cy.intercept('POST', '/api/v1/zones').as('createZone')
    cy.intercept('PUT', '/api/v1/zones/*').as('updateZone')
    cy.intercept('DELETE', '/api/v1/zones/*').as('deleteZone')

    cy.kcLogin('tcolin')
    cy.visit('/admin/zones')
    cy.url().should('contain', '/admin/zones')
    cy.wait('@listZones').its('response').then((response) => {
      zones = response?.body
    })
    cy.wait('@getClusters').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should display zones list', () => {
    zones?.forEach((zone) => {
      cy.getByDataTestid(`zoneTile-${zone.label}`)
        .should('be.visible')
        .click()
      cy.getByDataTestid('slugInput')
        .should('have.value', zone.slug)
        .and('be.disabled')
      cy.getByDataTestid('labelInput')
        .should('have.value', zone.label)
        .and('be.enabled')
      cy.getByDataTestid('descriptionInput')
        .should('have.value', zone.description)
        .and('be.enabled')
      cy.get('#clusters-select')
        .should('not.exist')
      cy.getByDataTestid('updateZoneBtn')
        .should('be.enabled')
      cy.getByDataTestid('cancelZoneBtn')
        .click()
    })
  })

  it('Should update a zone', () => {
    const zone = zones.find(({ slug }) => slug === 'pr')
    const updatedZone = {
      label: 'Zone Mise à Jour',
      description: 'Cette zone a été mise à jour.',
    }
    cy.getByDataTestid(`zoneTile-${zone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .should('have.value', zone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .clear()
      .type(updatedZone.label)
    cy.getByDataTestid('descriptionInput')
      .clear()
      .type(updatedZone.description)
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@updateZone').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`zoneTile-${updatedZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .should('have.value', zone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .should('have.value', updatedZone.label)
      .and('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .should('have.value', updatedZone.description)
      .and('be.enabled')
    cy.get('#clusters-select')
      .should('not.exist')
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
    cy.getByDataTestid('cancelZoneBtn')
      .click()

    cy.getByDataTestid(`zoneTile-${updatedZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('labelInput')
      .clear()
      .type(zone.label)
    cy.getByDataTestid('descriptionInput')
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
      .clear()
      .type(newZone.slug)
    cy.getByDataTestid('labelInput')
      .clear()
      .type(newZone.label)
    cy.getByDataTestid('descriptionInput')
      .clear()
      .type(newZone.description)
    newZone.clusterIds.forEach((id) => {
      cy.getByDataTestid(`${id}-clusters-select-tag`)
        .click()
    })
    cy.getByDataTestid('addZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@createZone').its('response.statusCode').should('match', /^20\d$/)

    cy.reload()
    cy.wait('@listZones').its('response.statusCode').should('match', /^20\d$/)

    cy.getByDataTestid(`zoneTile-${newZone.label}`)
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .should('have.value', newZone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .should('have.value', newZone.label)
      .and('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .should('have.value', newZone.description)
      .and('be.enabled')
    cy.get('#clusters-select')
      .should('not.exist')
    cy.getByDataTestid('updateZoneBtn')
      .should('be.enabled')
    cy.getByDataTestid('cancelZoneBtn')
      .click()
    zones.forEach((zone) => {
      cy.getByDataTestid(`zoneTile-${zone.label}`)
        .should('be.visible')
        .click()
      cy.get('#clusters-select')
        .should('not.exist')
      cy.getByDataTestid('cancelZoneBtn')
        .click()
    })
  })

  it('Should not create a zone if slug is already taken', () => {
    cy.getByDataTestid('createZoneLink')
      .should('be.visible')
      .click()
    cy.getByDataTestid('slugInput')
      .clear()
      .type(newZone.slug)
    cy.getByDataTestid('labelInput')
      .clear()
      .type(newZone.label)
    cy.getByDataTestid('descriptionInput')
      .clear()
      .type(newZone.description)
    newZone.clusters.forEach((cluster) => {
      cy.getByDataTestid(`${cluster.id}-clusters-select-tag`)
        .click()
    })
    cy.getByDataTestid('addZoneBtn')
      .should('be.enabled')
      .click()

    cy.wait('@createZone').its('response.statusCode').should('match', /^40\d$/)
    cy.getByDataTestid('snackbar').should('contain', `Une zone portant le nom ${newZone.slug} existe déjà.`)
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
    cy.intercept('PUT', '/api/v1/clusters/*').as('updateCluster')

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
    cy.wait('@listZones')
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
