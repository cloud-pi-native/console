describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles according to selected project', () => {
    cy.goToProjects()
      .getByDataTestid('projectTile-candilib').click()
      .getByDataTestid('menuServices').click()
      .get('div.fr-tile')
      .should('have.length', 6)
      .get('a.fr-tile__link:first')
      .should('have.attr', 'href', 'https://gitlab.com/ministere-interieur/candilib')
  })
})
