import type { ProjectV2 } from '@cpn-console/shared'
import { getModel } from '../support/func.js'

const projects = getModel('project')
const betaapp = projects.find(({ name }) => name === 'betaapp') as ProjectV2

describe('Project Logs', () => {
  beforeEach(() => {
  })

  it('Should display project logs as owner', () => {
    cy.kcLogin('test')
    cy.intercept('GET', '/api/v1/logs?*').as('listLogs')
    cy.intercept('PUT', `/api/v1/projects/${betaapp.id}/hooks`).as('replayHooks')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${betaapp.slug}`).click()
    cy.getByDataTestid('displayLogsPanel')
      .should('not.be.visible')
    cy.getByDataTestid('displayLogsBtn')
      .should('be.visible')
      .click()
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '1 - 2 sur 2')
      })
    cy.getByDataTestid('replayHooksBtn')
      .click()
    cy.wait('@replayHooks')
    cy.wait('@listLogs')
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '1 - 3 sur 3')
      })
    cy.getByDataTestid('mainMenu').should('be.visible')
    cy.getByDataTestid('menuMyProjects').click()
      .url().should('contain', '/projects')
    cy.getByDataTestid('displayLogsPanel')
      .should('not.exist')
  })

  it('Should handle display project logs as manager or memebr of project', () => {
    cy.kcLogin('tcolin')
    cy.intercept('GET', '/api/v1/logs?*').as('listLogs')

    // as owner
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${betaapp.slug}`).click()
    cy.wait('@listLogs')
    cy.getByDataTestid('displayLogsPanel')
      .should('not.be.visible')
    cy.getByDataTestid('displayLogsBtn')
      .should('be.visible')
      .click()
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '1 - 3 sur 3')
      })
    cy.getByDataTestid('menuRepos').click()
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '1 - 3 sur 3')
      })

    // as member
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-mi-candilib`).click()
    cy.wait('@listLogs')
    cy.getByDataTestid('displayLogsPanel')
      .should('not.be.visible')
    cy.getByDataTestid('displayLogsBtn')
      .should('be.visible')
      .click()
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '0 - 0 sur 0')
      })
    cy.getByDataTestid('menuRepos').click()
    cy.getByDataTestid('displayLogsPanel')
      .should('be.visible')
      .within(() => {
        cy.get('span').should('contain', '0 - 0 sur 0')
      })
  })
})
