import type { Log } from '@cpn-console/shared'

describe('Administration logs', () => {
  let logCount: number
  let logs: Log[]

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/logs*').as('getAllLogs')

    cy.kcLogin('tcolin')
    cy.visit('/admin/logs')
    cy.url().should('contain', '/admin/logs')
    cy.wait('@getAllLogs', { timeout: 10000 }).its('response').then((response) => {
      logs = response?.body?.logs
      logCount = response?.body?.total
    })
  })

  it('Should display logs list, loggedIn as admin', () => {
    cy.getByDataTestid('logCountInfo').should('contain', `Total : ${logCount} événements`)
    cy.getByDataTestid('positionInfo').should('contain', `1 - 10 sur ${logCount}`)

    cy.getByDataTestid('seePreviousPageBtn').should('be.disabled')
    cy.getByDataTestid('seeFirstPageBtn').should('be.disabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.enabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(0, 10).forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeNextPageBtn').first().click()
    cy.getByDataTestid('seePreviousPageBtn').should('be.enabled')
    cy.getByDataTestid('seeFirstPageBtn').should('be.enabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.enabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(10, 10).forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeLastPageBtn').first().click()
    cy.getByDataTestid('seePreviousPageBtn').should('be.enabled')
    cy.getByDataTestid('seeFirstPageBtn').should('be.enabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.disabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.disabled')
    cy.get('[data-testid$="-json"]')
      .should('have.length.of.at.least', 1)
      .and('have.length.at.most', 10)
    logs.slice(20, logCount - 20).forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })

    cy.getByDataTestid('seeFirstPageBtn').first().click()
    cy.getByDataTestid('seePreviousPageBtn').should('be.disabled')
    cy.getByDataTestid('seeFirstPageBtn').should('be.disabled')
    cy.getByDataTestid('seeNextPageBtn').should('be.enabled')
    cy.getByDataTestid('seeLastPageBtn').should('be.enabled')
    cy.get('[data-testid$="-json"]').should('have.length', 10)
    logs.slice(0, 10).forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`)
        .should('be.visible')
    })
  })

  it('Should display compact logs list, loggedIn as admin', () => {
    cy.getByDataTestid('showLogsBtn').click()
    logs.forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`).should('not.exist')
    })
    cy.getByDataTestid('showLogsBtn').click()
    logs.forEach((log) => {
      cy.getByDataTestid(`${log.id}-json`).should('exist')
    })
  })
})
