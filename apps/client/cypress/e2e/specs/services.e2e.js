import { getProjectbyId } from '../support/func.js'

const project = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')

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
      .getByDataTestid('argocd-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('argocdUrl')}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${project.organization}-${project.name}`)
      .getByDataTestid('gitlab-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('gitlabUrl')}/forge-mi/projects/${project.organization}-${project.name}`)
      .getByDataTestid('nexus-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('nexusUrl')}/#browse/browse:${project.organization}-${project.name}`)
      .getByDataTestid('quay-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('quayUrl')}/organization/${project.organization}-${project.name}`)
      .getByDataTestid('sonarqube-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('sonarqubeUrl')}/dashboard?id=${project.organization}-${project.name}`)
      .getByDataTestid('vault-tile').find('a')
      .should('have.attr', 'href', `${Cypress.env('vaultUrl')}/ui/vault/secrets/forge-dso/list/forge-mi/projects/${project.organization}-${project.name}`)
  })
})
