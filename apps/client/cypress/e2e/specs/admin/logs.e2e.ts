import { LogModel } from '@cpn-console/shared'

describe('Administration logs', () => {
  let logCount: number
  let logs: LogModel[]

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/logs*').as('getAllLogs')

    cy.kcLogin('tcolin')
    cy.visit('/admin/logs')
    cy.url().should('contain', '/admin/logs')
    cy.wait('@getAllLogs', { timeout: 10000 }).its('response').then(response => {
      logs = response?.body?.logs
      logCount = response?.body?.total
    })
  })

  it('Should display logs list, loggedIn as admin', () => {
    cy.getByDataTestid('logCountInfo').should('contain', `Total : ${logCount} événements`)
    cy.getByDataTestid('positionInfo').should('contain', `0 - 10 sur ${logCount}`)

    cy.getByDataTestid('seePreviousLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeFirstLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(0, 10).forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeNextLogsBtn').first().click()
    cy.getByDataTestid('seePreviousLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeFirstLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(10, 10).forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeLastLogsBtn').first().click()
    cy.getByDataTestid('seePreviousLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeFirstLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.disabled')
    cy.get('[data-testid$="-json"]').should('have.length', 2)
    logs.slice(20, logCount - 20).forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeFirstLogsBtn').first().click()
    cy.getByDataTestid('seePreviousLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeFirstLogsBtn').should('be.disabled')
    cy.getByDataTestid('seeNextLogsBtn').should('be.enabled')
    cy.getByDataTestid('seeLastLogsBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(0, 10).forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })
  })

  it('Should display compact logs list, loggedIn as admin', () => {
    cy.getByDataTestid('showLogsBtn').click()
    logs.forEach(log => {
      cy.getByDataTestid(`${log.id}-json`).should('not.exist')
    })
    cy.getByDataTestid('showLogsBtn').click()
    logs.forEach(log => {
      cy.getByDataTestid(`${log.id}-json`).should('exist')
    })
  })
})
