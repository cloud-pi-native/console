// TODO : ajouter fixtures
describe('Projects view', () => {
  it.skip('Should display select and button to create project', () => {
    cy.visit('/dashboard')
      .getByDataTestid('projectSelector')
      .find('select')
      .select(1)
      .should('have.value', 'Recette')
      .getByDataTestid('createProjectLink')
      .click()
      .url()
      .should('contain', '/create-project')
  })
})
