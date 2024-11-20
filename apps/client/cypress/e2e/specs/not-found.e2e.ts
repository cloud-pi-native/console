describe('Redirect to 404 if page not found', () => {
  it('should redirect loggedin user to 404 if page not found', () => {
    cy.kcLogin('test')
    cy.visit('/nowhere')
    cy.get('.fr-h1')
      .should('contain.text', 'Page non trouvée')
  })
})
