import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

describe('Redirection', () => {
  it('Should redirect to original page on reload', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
      .intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
      .intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')
    cy.kcLogin('test')
      .visit('/')
      .reload()
      .url().should('match', /\/#state=/)
      .goToProjects()
      .reload()
      .wait('@postToken')
      .wait('@getAccount', { timeout: 10000 }).its('response').then(_response => {
        cy.wait('@getProjects').its('response').then(response => {
          cy.get('[data-testid^="projectTile-"]')
            .should('have.length', `${response.body.length}`)
            .url().should('contain', '/projects')
            .getByDataTestid(`projectTile-${candilib.projectName}`).click()
            .url().should('contain', `/projects/${candilib.id}/dashboard`)
            .getSettled('p').should('contain', 'Dashboard')
            .reload()
            .wait('@getProjects')
            .url().should('contain', `/projects/${candilib.id}/dashboard`)
            .getSettled('p').should('contain', 'Dashboard')
            .getByDataTestid('currentProjectInfo')
            .should('contain', `Le projet courant est : ${candilib.projectName}`)
        })
      })
  })

  it('Should redirect to login page if not logged in', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
      .intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
      .intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')
    cy.visit(`/projects/${candilib.id}/dashboard`)
      .url().should('not.contain', `/projects/${candilib.id}/dashboard`)
      .get('input#username').type('test')
      .get('input#password').type('test')
      .get('input#kc-login').click()
      .wait('@postToken')
      .wait('@getAccount', { timeout: 10000 }).its('response').then(_response => {
        cy.wait('@getProjects')
          .url().should('contain', `/projects/${candilib.id}/dashboard`)
          .getSettled('p').should('contain', 'Dashboard')
          .getByDataTestid('currentProjectInfo')
          .should('contain', `Le projet courant est : ${candilib.projectName}`)
      })
  })
})
