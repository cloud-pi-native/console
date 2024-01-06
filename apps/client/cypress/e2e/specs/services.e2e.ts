import { getModelById } from '../support/func'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles and url services according to selected project', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuServices').click()
      .get('div.fr-tile')
      .should('have.length', 4)
      .get('#ArgoCD').find('a')
      .should('have.attr', 'href', `${Cypress.env('argocdUrl')}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.organization.name}-${project.name}`)
      .get('#Gitlab').find('a')
      .should('have.attr', 'href', `${Cypress.env('gitlabUrl')}/forge-mi/projects/${project.organization.name}/${project.name}`)
      .get('#Harbor').find('a')
      .should('have.attr', 'href').then(href => expect(href).to.match(new RegExp(`${Cypress.env('harborUrl')}/harbor/projects/`)))
      .get('#SonarQube').find('a')
      .should('have.attr', 'href', `${Cypress.env('sonarqubeUrl')}/projects`)
  })
})
