import { getModelById } from '../support/func.js'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles and url services according to selected project', () => {
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuServices').click()
    cy.getByDataTestid('service-argocd').within(() => {
      cy.get('a:first')
        .should('have.attr', 'href', 'https://theuselessweb.com/')
      cy.get('img:first')
        .should('have.attr', 'src', '/img/argocd.svg')
    })
  })
})
