import { getModel } from '../../support/func.js'
import { statusDict, formatDate, sortArrByObjKeyAsc } from 'shared'

describe('Administration projects', () => {
  const organizations = getModel('organization')
  let projects

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/projects').as('getAllProjects')

    cy.kcLogin('tcolin')
    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects', { timeout: 10000 }).its('response').then(response => {
      projects = sortArrByObjKeyAsc(response.body, 'name')
        ?.map(project => ({
          organization: organizations.find(organization => organization.id === project.organizationId).label,
          name: project.name,
          description: project.description ?? '',
          owner: project.roles[0].user,
          status: project.status,
          locked: project.locked,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        }),
        )
    })
  })

  it('Should display projects table, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      projects.forEach((project, index) => {
        cy.get(`tbody tr:nth-of-type(${index + 1})`).within(() => {
          cy.get('td:nth-of-type(1)').should('contain', project.organization)
          cy.get('td:nth-of-type(2)').should('contain', project.name)
          cy.get('td:nth-of-type(3)').should('contain', project.description)
          cy.get('td:nth-of-type(4)').should('contain', project.owner.email)
          cy.get('td:nth-of-type(5) svg title').should('contain', `Le projet ${project.name} est ${statusDict.status[project.status].wording}`)
          cy.get('td:nth-of-type(6) svg title').should('contain', `Le projet ${project.name} est ${statusDict.locked[!!project.locked].wording}`)
          cy.get('td:nth-of-type(7)').should('contain', formatDate(project.createdAt))
          cy.get('td:nth-of-type(8)').should('contain', formatDate(project.updatedAt))
        })
      })
    })
  })
})
