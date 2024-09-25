import { type SystemSettings, systemSettingsSchema } from '@cpn-console/shared'
import { getModel } from '../../support/func.js'

describe('Administration system settings', () => {
  const systemSettings = getModel('systemSetting') as SystemSettings

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/system/settings?key=maintenance').as('listMaintenanceSetting')
    cy.intercept('GET', 'api/v1/system/settings').as('listSystemSettings')
    cy.intercept('POST', 'api/v1/system/settings').as('upsertSystemSettings')

    cy.kcLogin('tcolin')
    cy.visit('/admin/system-settings')
    cy.url().should('contain', '/admin/system-settings')
    cy.wait('@listSystemSettings', { timeout: 5_000 }).its('response').then(($response) => {
      expect($response?.statusCode).to.match(/^20\d$/)
    })
  })

  it('Should turn on maintenance mode', () => {
    cy.intercept('GET', 'api/v1/admin/roles').as('listRoles')

    systemSettings.forEach((setting) => {
      cy.getByDataTestid(`toggle-${setting.key}`)
        .find('input')
        .should('be.enabled')
    })

    cy.getByDataTestid(`toggle-maintenance`)
      .find('input')
      .check({ force: true })

    cy.getByDataTestid('button-submit')
      .click()

    cy.wait('@upsertSystemSettings').its('response').then(($response) => {
      expect($response?.statusCode).to.match(/^20\d$/)
      expect(JSON.stringify($response?.body)).to.equal(JSON.stringify(systemSettingsSchema.parse({})))
    })

    cy.visit('/projects')
    cy.url().should('contain', '/projects')
    cy.getByDataTestid('maintenance-notice')
      .should('be.visible')
    cy.kcLogout()

    cy.visit('/')
    cy.getByDataTestid('maintenance-notice')
      .should('not.exist')

    cy.kcLogin('test')
    cy.getByDataTestid('maintenance-notice')
      .should('not.exist')
    cy.visit('/projects')
    // TODO à creuser : La requête est faite deux fois
    // la première renvoie "off" alors qu'en bdd la valeur est à "on"
    cy.wait('@listMaintenanceSetting').its('response').then(($response) => {
      cy.log(JSON.stringify($response?.body))
    })
    cy.wait('@listMaintenanceSetting').its('response').then(($response) => {
      cy.log(JSON.stringify($response?.body))
      expect($response?.statusCode).to.match(/^20\d$/)
      expect(JSON.stringify($response?.body)).to.equal(JSON.stringify([{
        key: 'maintenance',
        value: 'true',
      }]))
    })
    cy.wait('@listRoles')
    cy.getByDataTestid('maintenance-notice')
      .should('be.visible')
    cy.visit('/projects')
    cy.url().should('contain', '/maintenance')
    cy.getByDataTestid('contact-us')
      .should('have.attr', 'title', 'cloudpinative-relations@interieur.gouv.fr')
  })

  it('Should turn off maintenance mode', () => {
    systemSettings.forEach((setting) => {
      cy.getByDataTestid(`toggle-${setting.key}`)
        .find('input')
        .should('be.enabled')
    })

    cy.getByDataTestid(`toggle-maintenance`)
      .find('input')
      .uncheck({ force: true })

    cy.getByDataTestid('button-submit')
      .click()

    cy.wait('@upsertSystemSettings').its('response').then(($response) => {
      expect($response?.statusCode).to.match(/^20\d$/)
      expect(JSON.stringify($response?.body)).to.equal(JSON.stringify(systemSettingsSchema.parse({})))
    })

    cy.visit('/projects')
    cy.wait('@listMaintenanceSetting').its('response').then(($response) => {
      expect($response?.statusCode).to.match(/^20\d$/)
      expect(JSON.stringify($response?.body)).to.equal(JSON.stringify([{
        key: 'maintenance',
        value: 'true',
      }]))
    })
    cy.getByDataTestid('maintenance-notice')
      .should('not.exist')
    cy.url().should('contain', '/projects')
    cy.kcLogout()

    cy.kcLogin('test')
    cy.getByDataTestid('maintenance-notice')
      .should('not.exist')
    cy.visit('/projects')
    cy.url().should('contain', '/projects')
  })
})
