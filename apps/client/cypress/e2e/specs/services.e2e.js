import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

describe('Services view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display tiles and url services according to selected project', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .getByDataTestid('menuServices').click()
      .get('div.fr-tile')
      .should('have.length', 6)
      .get('#argocd').find('a')
      .should('have.attr', 'href', `${Cypress.env('argocdUrl')}/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=${candilib.orgName}-${candilib.projectName}`)
      .get('#gitlab').find('a')
      .should('have.attr', 'href', `${Cypress.env('gitlabUrl')}/forge-mi/projects/${candilib.orgName}/${candilib.projectName}`)
      .get('#nexus').find('a')
      .should('have.attr', 'href', `${Cypress.env('nexusUrl')}/#browse/browse:${candilib.orgName}-${candilib.projectName}-repository-group`)
      .get('#quay').find('a')
      .should('have.attr', 'href', `${Cypress.env('quayUrl')}/organization/${candilib.orgName}-${candilib.projectName}`)
      .get('#sonarqube').find('a')
      .should('have.attr', 'href', `${Cypress.env('sonarqubeUrl')}/dashboard?id=${candilib.orgName}-${candilib.projectName}`)
      .get('#vault').find('a')
      .should('have.attr', 'href', `${Cypress.env('vaultUrl')}/ui/vault/secrets/forge-dso/list/forge-mi/projects/${candilib.orgName}/${candilib.projectName}`)
  })
})
