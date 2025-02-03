import { getModelById } from '../support/func.js'

describe('Manage project environments', () => {
  const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38c5')

  it('Test modal behaviour', () => {
    cy.kcLogin('test')

    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('GET', 'api/v1/stages').as('listStages')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project?.slug}`)
      .click()

    cy.getByDataTestid('environmentTr-integration')
      .as('envTr')

    // Open the modal
    cy.get('@envTr').click()
    cy.get('#fr-modal-1').should('be.visible')

    // close by clickOutside
    cy.get('#fr-modal-1')
      .click('right')
    cy.getByDataTestid('resource-modal')
      .should('not.exist')

    // Open the modal
    cy.get('@envTr').click()
    cy.get('#fr-modal-1').should('be.visible')

    // close by native button
    cy.get('div.fr-modal__header > button.fr-btn--close')
      .click()
    cy.getByDataTestid('resource-modal')
      .should('not.exist')

    // Open the modal
    cy.get('@envTr').click()
    cy.get('#fr-modal-1').should('be.visible')

    // cancel by form button
    cy.getByDataTestid('cancelEnvironmentBtn')
      .click()
    cy.getByDataTestid('resource-modal')
      .should('not.exist')

    // Open the modal
    cy.get('@envTr').click()
    cy.get('#fr-modal-1').should('be.visible')

    // cancel by pressing escape
    cy.get('body').type('{esc}')
    cy.getByDataTestid('resource-modal')
      .should('not.exist')
  })
})
