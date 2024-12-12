import { swaggerUiPath } from '@cpn-console/shared'
import { getModelById } from '../support/func.js'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Redirection', () => {
  it('Should redirect to original page on reload', () => {
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')

    cy.kcLogin('test')
    cy.visit('/')
    cy.reload()
    cy.url().should('match', /\/#state=/)
    cy.goToProjects()
    cy.reload()
    cy.wait('@postToken')
    cy.url().should('match', /projects#state=/)
    cy.wait('@listProjects').its('response').then((response) => {
      cy.get('[data-testid^="projectTile-"]')
      cy.should('have.length', `${response?.body.length}`)
      cy.getByDataTestid(`projectTile-${project.name}`).click()
      cy.url().should('contain', `/projects/${project.id}/dashboard`)
    })
    cy.reload()
    cy.wait('@postToken')
    cy.url().should('contain', `/projects/${project.id}/dashboard`)
    cy.wait('@listProjects').its('response').then((_response) => {
      cy.getByDataTestid('descriptionP')
      cy.should('contain', project.description)
    })
  })

  it('Should redirect to login page if not logged in', () => {
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
    cy.intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')

    cy.visit(`/projects/${project.id}/dashboard`)
    cy.url().should('not.contain', `/projects/${project.id}/dashboard`)
    cy.get('input#username').type('test')
    cy.get('input#password').type('test')
    cy.get('input#kc-login').click()
    cy.wait('@postToken')
    cy.url().should('contain', `/projects/${project.id}/dashboard`)
    cy.wait('@listProjects', { timeout: 5_000 }).its('response').then((_response) => {
      cy.getByDataTestid('descriptionP')
      cy.should('contain', project.description)
    })
  })

  it('Should redirect to home if trying to access login page while logged', () => {
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
    cy.intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')

    cy.visit('/login')
    cy.url().should('not.contain', '/login')
    cy.get('input#username').type('test')
    cy.get('input#password').type('test')
    cy.get('input#kc-login').click()
    cy.wait('@postToken')
    cy.url().should('contain', '/')
    cy.get('h1').contains(' Cloud π Native ')
      .should('exist')
  })

  it('Should redirect to swagger ui', () => {
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')

    cy.visit('/')
    cy.get('h1').contains(' Cloud π Native ')
      .should('exist')

    cy.getByDataTestid('swaggerUrl')
      .click()
    cy.url().should('have.text', swaggerUiPath)
    cy.get('div.description')
      .should('contain', 'API de gestion des ressources Cloud Pi Native.')
  })
})
