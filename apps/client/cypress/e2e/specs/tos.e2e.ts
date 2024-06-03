describe('Terms of services', () => {
  it('Should display terms of services, loggedin', () => {
    cy.kcLogin('test')
    cy.visit('/tos')
      .get('h1')
      .should('contain', 'Conditions Générales d\'Utilisation')
  })

  it('Should display terms of services, loggedout', () => {
    cy.kcLogout()
    cy.visit('/tos')
      .get('h1')
      .should('contain', 'Conditions Générales d\'Utilisation')
  })
})
