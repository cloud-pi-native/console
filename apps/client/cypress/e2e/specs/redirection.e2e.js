import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

// TODO : cette suite passe en mode open mais pas en mode ci (getProjects() pas reçu)
describe.skip('Redirection', () => {
  it('Should redirect to original page on reload', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
    cy.intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')

    cy.kcLogin('test')
    cy.visit('/')
    cy.reload()
    cy.url().should('match', /\/#state=/)
    cy.goToProjects()
    cy.reload()
    cy.wait('@postToken')
    cy.wait('@getAccount')
    cy.url().should('match', /projects#state=/)
    cy.wait('@getProjects').its('response').then(response => {
      cy.get('[data-testid^="projectTile-"]')
      cy.should('have.length', `${response.body.length}`)
      cy.getByDataTestid(`projectTile-${candilib.projectName}`).click()
      cy.url().should('contain', `/projects/${candilib.id}/dashboard`)
      cy.getSettled('p').should('contain', 'Dashboard')
    })
    cy.reload()
    cy.wait('@postToken')
    cy.wait('@getAccount')
    cy.url().should('contain', `/projects/${candilib.id}/dashboard`)
    cy.wait('@getProjects').its('response').then(_response => {
      cy.getSettled('p').should('contain', 'Dashboard')
      cy.getByDataTestid('currentProjectInfo')
      cy.should('contain', `Le projet courant est : ${candilib.projectName}`)
    })
  })

  it('Should redirect to login page if not logged in', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
    cy.intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')

    cy.visit(`/projects/${candilib.id}/dashboard`)
    cy.url().should('not.contain', `/projects/${candilib.id}/dashboard`)
    cy.get('input#username').type('test')
    cy.get('input#password').type('test')
    cy.get('input#kc-login').click()
    cy.wait('@postToken')
    cy.wait('@getAccount')
    cy.url().should('contain', `/projects/${candilib.id}/dashboard`)
    cy.wait('@getProjects', { timeout: 5000 }).its('response').then(_response => {
      cy.getSettled('p').should('contain', 'Dashboard')
      cy.getByDataTestid('currentProjectInfo')
      cy.should('contain', `Le projet courant est : ${candilib.projectName}`)
    })
  })
})
