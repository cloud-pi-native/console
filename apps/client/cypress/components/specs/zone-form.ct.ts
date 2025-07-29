import { type Pinia, createPinia, setActivePinia } from 'pinia'

import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'

import { getRandomCluster, getRandomZone } from '@cpn-console/test-utils'
import ZoneForm from '@/components/ZoneForm.vue'
import { useSnackbarStore } from '@/stores/snackbar'

describe('ZoneForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a new zone ZoneForm', () => {
    useSnackbarStore()

    const props = {
      associatedClusters: [],
      isNewZone: true,
      allClusters: [getRandomCluster({})],
    }

    cy.mount(ZoneForm, { props })

    cy.getByDataTestid('addZoneBtn').should('be.disabled')
    cy.getByDataTestid('deleteZoneZone').should('not.exist')
    cy.getByDataTestid('slugInput')
      .clear()
      .type('zad')
    cy.getByDataTestid('labelInput')
      .clear()
      .type('Zone à Défendre')
    cy.getByDataTestid('argocdUrlInput')
      .clear()
      .type('https://vousetesici.fr')
    cy.getByDataTestid('addZoneBtn').should('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .clear()
      .type('Cette zone de déploiement est publique.')
    cy.getByDataTestid('addZoneBtn').should('be.enabled')
  })

  it('Should mount a new zone ZoneForm without clusters', () => {
    useSnackbarStore()

    const props = {
      associatedClusters: [],
      isNewZone: true,
      allClusters: [],
    }

    cy.mount(ZoneForm, { props })

    cy.getByDataTestid('addZoneBtn').should('be.disabled')
    cy.getByDataTestid('deleteZoneZone').should('not.exist')
    cy.getByDataTestid('slugInput')
      .clear()
      .type('zad')
    cy.getByDataTestid('labelInput')
      .clear()
      .type('Zone à Défendre')
    cy.getByDataTestid('argocdUrlInput')
      .clear()
      .type('https://vousetesici.fr')
    cy.getByDataTestid('addZoneBtn').should('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .clear()
      .type('Cette zone de déploiement est publique.')
    cy.getByDataTestid('addZoneBtn').should('be.enabled')
  })

  it('Should mount an update ZoneForm', () => {
    const zone = getRandomZone()
    const cluster = getRandomCluster({ zoneId: zone.id })
    useSnackbarStore()

    const props = {
      associatedClusters: [cluster],
      zone: { ...zone, clusterIds: [cluster.id] },
      allClusters: [cluster],
    }

    cy.mount(ZoneForm, { props })

    cy.getByDataTestid('updateZoneBtn').should('be.enabled')
    cy.getByDataTestid('deleteZoneZone').should('not.exist')
    cy.getByDataTestid('slugInput')
      .should('have.value', props.zone.slug)
      .and('be.disabled')
    cy.getByDataTestid('labelInput')
      .should('have.value', props.zone.label)
      .and('be.enabled')
      .clear()
      .type('Zone à Détruire')
    cy.getByDataTestid('argocdUrlInput')
      .should('have.value', props.zone.argocdUrl)
      .and('be.enabled')
      .clear()
      .type('https://vousetesici.fr')
    cy.getByDataTestid('updateZoneBtn').should('be.enabled')
    cy.getByDataTestid('descriptionInput')
      .should('have.value', props.zone.description)
      .and('be.enabled')
      .clear()
      .type('Cette zone de déploiement est privée.')
    cy.getByDataTestid('updateZoneBtn').should('be.enabled')
    cy.get('#clusters-select h6')
      .click()
    cy.getByDataTestid(`${props.allClusters[0].id}-clusters-select-tag`)
      .should('be.visible')
      .click()
    cy.getByDataTestid(`${props.allClusters[0].id}-clusters-select-tag`)
      .should('be.disabled')
    cy.getByDataTestid('updateZoneBtn').should('be.enabled')
  })
})
