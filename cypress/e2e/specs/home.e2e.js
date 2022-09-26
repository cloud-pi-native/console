describe('Home', () => {
  it('Title', () => {
    cy.visit('/')
      .get('.fr-header__service')
      .should('contain', 'Service')
      .get('.fr-header__service-tagline')
      .should('contain', 'Description du service')
  })
})
