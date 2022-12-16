describe('Header', () => {
  it('Should display application Header', () => {
    cy.visit('/')
      .get('.fr-header__service')
      .should('contain', 'Console Cloud PI Native')
      .get('.fr-header__service-tagline')
      .should('not.exist')
  })
})
