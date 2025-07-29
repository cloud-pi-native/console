import { getModelById } from '../support/func'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles and url services according to selected project', () => {
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.slug}`).click()
    cy.getByDataTestid('test-tab-services').click()
    cy.getByDataTestid('service-config-argocd')
      .click()
      .within(() => {
        cy.get('input')
          .should('have.length', 1)
      })
  })
})
