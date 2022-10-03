describe('Projects view', () => {
  it('Should display select and button to order project', () => {
    cy.visit('/dashboard')
      .getByDataTestid('projectSelector')
      .find('select')
      .select(0)
      .should('have.value', 'candilib-id')
      .getByDataTestid('orderProjectLink')
      .click()
      .url()
      .should('contain', '/order-project')
  })
})
