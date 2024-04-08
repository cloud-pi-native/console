describe('Services health', () => {
  it('Should display services health, loggedIn', () => {
    cy.intercept('GET', '/api/v1/services').as('getServices')

    cy.kcLogin('test')

    cy.visit('/')
      .getByDataTestid('menuServicesHealth').click()
      .url().should('contain', '/services-health')
      .get('h1').should('contain', 'Status des services de la plateforme DSO')
    cy.getByDataTestid('box-info').children().should('have.length', 7)
  })

  it('Should display services health, not loggedIn', () => {
    cy.intercept('GET', '/api/v1/services').as('getServices')

    cy.visit('/')
    cy.get('a.fr-btn').should('contain', 'Se connecter')
    cy.getByDataTestid('menuServicesHealth')
      .should('be.visible')
      .click()
    cy.url().should('contain', '/services-health')
    cy.get('h1').should('contain', 'Status des services de la plateforme DSO')
    cy.getByDataTestid('box-info').children().should('have.length', 7)
  })
})
