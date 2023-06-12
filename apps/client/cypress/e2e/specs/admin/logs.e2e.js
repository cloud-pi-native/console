describe('Administration logs', () => {
  let logCount
  let logs

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/logs/count').as('countLogs')
    cy.intercept('GET', 'api/v1/admin/logs/0/5').as('getAllLogs')

    cy.kcLogin('tcolin')
    cy.visit('/admin/logs')
    cy.url().should('contain', '/admin/logs')
    cy.wait('@countLogs', { timeout: 10000 }).its('response').then(response => {
      logCount = response?.body
    })
    cy.wait('@getAllLogs', { timeout: 10000 }).its('response').then(response => {
      logs = response?.body
    })
  })

  it('Should display logs list, loggedIn as admin', () => {
    cy.getByDataTestid('logCountInfo').should('contain', `Total : ${logCount} logs`)
    logs.forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
    })
  })
})
