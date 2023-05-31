import { getModelById } from '../support/func.js'

const project = getModelById('projects', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles and url services according to selected project', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuServices').click()
      .get('div.fr-tile')
      .should('have.length', 6)
      .get('#argocd').find('a')
      .should('have.attr', 'href', `${Cypress.env('argocdUrl')}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.organization.name}-${project.name}`)
      .get('#gitlab').find('a')
      .should('have.attr', 'href', `${Cypress.env('gitlabUrl')}/forge-mi/projects/${project.organization.name}/${project.name}`)
      .get('#nexus').find('a')
      .should('have.attr', 'href', `${Cypress.env('nexusUrl')}/#browse/browse:${project.organization.name}-${project.name}-repository-group`)
      .get('#registry').find('a')
      .should('have.attr', 'href').then(href => expect(href).to.match(new RegExp(`${Cypress.env('harborUrl')}/harbor/projects/`)))
      .get('#sonarqube').find('a')
      .should('have.attr', 'href', `${Cypress.env('sonarqubeUrl')}/dashboard?id=${project.organization.name}-${project.name}`)
      .get('#vault').find('a')
      .should('have.attr', 'href', `${Cypress.env('vaultUrl')}/ui/vault/secrets/forge-dso/list/forge-mi/projects/${project.organization.name}/${project.name}`)
  })
})
