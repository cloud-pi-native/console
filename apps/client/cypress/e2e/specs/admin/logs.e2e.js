describe('Administration logs', () => {
  let logCount
  let logs

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/logs*').as('getAllLogs')

    cy.kcLogin('tcolin')
    cy.visit('/admin/logs')
    cy.url().should('contain', '/admin/logs')
    cy.wait('@getAllLogs', { timeout: 10000 }).its('response').then(response => {
      logs = response.body?.logs
      logCount = response.body?.total
    })
  })

  it('Should display logs list, loggedIn as admin', () => {
    cy.getByDataTestid('logCountInfo').should('contain', `Total : ${logCount} événements`)
    logs.forEach(log => {
      cy.getByDataTestid(`${log.id}-json`)
    })
  })
})
