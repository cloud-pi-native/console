// TODO : ajouter fixtures
describe('Projects view', () => {
  it.skip('Should display select and button to order project', () => {
    cy.visit('/dashboard')
      .getByDataTestid('projectSelector')
      .find('select')
      .select(1)
      .should('have.value', 'Recette')
      .getByDataTestid('orderProjectLink')
      .click()
      .url()
      .should('contain', '/order-project')
  })
})
