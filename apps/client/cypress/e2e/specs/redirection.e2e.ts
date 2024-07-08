import { getModelById } from '../support/func.js'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
const organization = getModelById('organization', project.organizationId)

describe('Redirection', () => {
  it('Should redirect to original page on reload', () => {
    cy.intercept('GET', '/api/v1/stages').as('getStages')
    cy.intercept('GET', '/api/v1/projects/mines').as('getProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')

    cy.kcLogin('test')
    cy.visit('/')
    cy.reload()
    cy.url().should('match', /\/#state=/)
    cy.goToProjects()
    cy.reload()
    cy.wait('@postToken')
    cy.url().should('match', /projects#state=/)
    cy.wait('@getProjects').its('response').then(response => {
      cy.get('[data-testid^="projectTile-"]')
      cy.should('have.length', `${response?.body.length}`)
      cy.getByDataTestid(`projectTile-${project.name}`).click()
      cy.url().should('contain', `/projects/${project.id}/dashboard`)
      cy.wait('@getStages')
    })
    cy.reload()
    cy.wait('@postToken')
    cy.url().should('contain', `/projects/${project.id}/dashboard`)
    cy.wait('@getStages')
    cy.wait('@getProjects').its('response').then(_response => {
      cy.getByDataTestid('currentProjectInfo')
      cy.should('contain', `Le projet courant est : ${project.name} (${organization.label})`)
    })
  })

  it('Should redirect to login page if not logged in', () => {
    cy.intercept('GET', '/api/v1/stages').as('getStages')
    cy.intercept('GET', '/api/v1/projects/mines').as('getProjects')
    cy.intercept('POST', '/realms/cloud-pi-native/protocol/openid-connect/token').as('postToken')
    cy.intercept('GET', '/realms/cloud-pi-native/account').as('getAccount')

    cy.visit(`/projects/${project.id}/dashboard`)
    cy.url().should('not.contain', `/projects/${project.id}/dashboard`)
    cy.get('input#username').type('test')
    cy.get('input#password').type('test')
    cy.get('input#kc-login').click()
    cy.wait('@postToken')
    cy.url().should('contain', `/projects/${project.id}/dashboard`)
    cy.wait('@getStages')
    cy.wait('@getProjects', { timeout: 5000 }).its('response').then(_response => {
      cy.getByDataTestid('currentProjectInfo')
      cy.should('contain', `Le projet courant est : ${project.name} (${organization.label})`)
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
})
