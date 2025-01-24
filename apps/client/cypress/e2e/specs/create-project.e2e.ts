import type { Organization } from '@cpn-console/shared'
import { getModel, getModelById } from '../support/func.js'

const organizations = getModel('organization')
const orgMi = organizations.find(({ name }) => name === 'mi') as Organization

describe('Create Project', () => {
  const project = {
    orgId: orgMi.id,
    name: 'project01',
    slug: 'mi-project01',
    description: 'Application de prise de rendez-vous en préfécture.',
  }

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .get('h1').should('contain', 'Commander un espace projet')
      .get('[data-testid^="repoFieldset-"]').should('not.exist')
    cy.getByDataTestid('ownerInfo').should('contain', owner.email)
      .get('select#organizationId-select').select(project.orgId)
      .getByDataTestid('nameInput').type(`${project.name} ErrorSpace`)
      .getByDataTestid('nameInput').should('have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.disabled')
      .getByDataTestid('nameInput').clear().type(project.name)
      .getByDataTestid('nameInput').should('not.have.class', 'fr-input--error')
      .getByDataTestid('createProjectBtn').should('be.enabled')
      .getByDataTestid('descriptionInput').clear().type(project.description)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

    cy.wait('@postProject').its('response.statusCode').should('match', /^20\d$/)
    cy.url().should('match', /projects\/.*\/dashboard/)

    cy.wait('@listProjects').its('response.statusCode').should('match', /^20\d$/)

    cy.assertCreateProjects([project.slug])
  })

  it('Should not create a project if name is already taken', () => {
    cy.intercept('POST', '/api/v1/projects').as('postProject')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    cy.goToProjects()
      .getByDataTestid('createProjectLink').click()
      .get('select#organizationId-select').select(project.orgId)
      .getByDataTestid('nameInput').type(`${project.name}`)
    cy.getByDataTestid('createProjectBtn').should('be.enabled').click()
    cy.wait('@postProject').its('response.statusCode').should('not.match', /^20\d$/)
    cy.getByDataTestid('snackbar').should('contain', `Le projet "${project.name}" existe déjà`)
  })
})
