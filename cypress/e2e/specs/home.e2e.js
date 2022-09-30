describe('Home', () => {
  it('Title', () => {
    cy.visit('/')
      .get('.fr-header__service')
      .should('contain', 'Portail Cloud PI Native')
      .get('.fr-header__service-tagline')
      .should('not.exist')
  })
})
