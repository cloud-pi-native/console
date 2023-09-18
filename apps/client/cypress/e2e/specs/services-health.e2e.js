describe('Services health', () => {
  it('Should not display services health if not loggedIn', () => {
    cy.visit('/services')
      .url().should('contain', 'auth')
  })
  it('Should display services health, loggedIn', () => {
    cy.intercept('GET', '/api/v1/services').as('getServices')

    cy.kcLogin('test')

    cy.visit('/')
      .getByDataTestid('menuServicesHealth').click()
      .url().should('contain', '/services-health')
      .get('h1').should('contain', 'Status des services de la plateforme DSO')
      .getByDataTestid('refresh-btn').should('be.disabled')
      .getByDataTestid('services-health-badge').should('contain', 'Vérification de l\'état des services...')
      .getByDataTestid('gitlab-info').should('not.exist')
      .getServicesResponse()
      .getByDataTestid('refresh-btn').should('be.enabled').click()
      // .getByDataTestid('refresh-btn').should('be.disabled')
      // .getByDataTestid('services-health-badge').should('contain', 'Vérification de l\'état des services...')
      .getByDataTestid('gitlab-info').should('not.exist')
      .getServicesResponse()
  })
})
