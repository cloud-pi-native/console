describe('Services view', () => {
  it('Should display tiles according to selected project', () => {
    cy.visit('/services')
      .getByDataTestid('projectTiles')
      .should('not.exist')
      .selectProject(0)
      .getByDataTestid('projectTiles')
      .find('div.fr-tile')
      .should('have.length', 6)
      .get('a.fr-tile__link:first')
      .should('have.attr', 'href', 'https://gitlab.com/')
  })
})
