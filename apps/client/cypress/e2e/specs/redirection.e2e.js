import { getProjectbyId } from '../support/func.js'

const candilib = getProjectbyId('9FG4CeGkMavI5CtAh_3Ss')

afterEach(() => {
  cy.kcLogout()
})

describe('Redirection', () => {
  it('Should redirect to original page on reload', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    cy.kcLogin('test')
      .visit('/')
      .reload()
      .url().should('match', /\/#state=/)
      .goToProjects()
      .reload()
      .wait('@getProjects').its('response').then(response => {
        cy.log(response.body.length)
          .get('[data-testid^="projectTile-"]')
          .should('have.length', `${response.body.length}`)
      })
      .url().should('match', /\/projects#state=/)
      .getByDataTestid(`projectTile-${candilib.projectName}`).click()
      .reload()
      .url().should('match', new RegExp(`/projects/${candilib.id}/dashboard#state=`))
      .getByDataTestid('currentProjectInfo')
      .should('contain', `Le projet courant est : ${candilib.projectName}`)
  })

  it('Should redirect to login page if not logged in', () => {
    cy.visit(`/projects/${candilib.id}/dashboard`)
      .url().should('not.contain', `/projects/${candilib.id}/dashboard`)
      .get('input#username').type('test')
      .get('input#password').type('test')
      .get('input#kc-login').click()
      .url().should('contain', `/projects/${candilib.id}/dashboard`)
      .getByDataTestid('currentProjectInfo')
      .should('contain', `Le projet courant est : ${candilib.projectName}`)
  })
})
