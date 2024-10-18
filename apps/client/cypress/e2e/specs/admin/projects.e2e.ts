import type { Organization, Project, ProjectV2 } from '@cpn-console/shared'
import { sortArrByObjKeyAsc, statusDict } from '@cpn-console/shared'
import { getModel, getModelById } from '../../support/func.js'

function checkTableRowsLength(length: number) {
  if (!length) cy.get('tr:last-child>td:first-child').should('have.text', 'Aucun projet trouvé')
  else cy.get('tbody > tr').should('have.length', length)
}

describe('Administration projects', () => {
  const admin = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const organizations = getModel('organization') as Organization[]
  let projects: ProjectV2[]

  const mapProjects = (body: Project[]) => {
    return sortArrByObjKeyAsc(body, 'name')
      ?.map(project => ({
        ...project,
        organization: organizations?.find(organization => organization.id === project.organizationId)?.label,
      }),
      )
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/projects*').as('getProjects')

    cy.kcLogin((admin.firstName.slice(0, 1) + admin.lastName).toLowerCase())
    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getProjects', { timeout: 10_000 }).its('response').then((response) => {
      projects = mapProjects(response?.body)
    })
  })

  it('Should display projects table, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.wait('@getAllProjects')
    cy.get('select#tableAdministrationProjectsFilter').select('Tous')
    cy.wait('@getAllProjects')
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody tr')
      .should('have.length.at.least', 2)
    cy.getByDataTestid('tableAdministrationProjects')
      .within(() => {
        projects.forEach((project, index: number) => {
          cy.get(`tbody tr:nth-of-type(${index + 1})`).within(() => {
            cy.getSettled('td:nth-of-type(1)').should('contain', project.organization)
            cy.getSettled('td:nth-of-type(2)').should('contain', project.name)
            cy.getSettled('td:nth-of-type(3)').should('contain', project.owner.email)
            cy.getSettled('td:nth-of-type(4) svg title').should('contain', `Le projet ${project.name} est ${statusDict.status[project.status].wording}`)
            cy.getSettled('td:nth-of-type(5) svg title').should('contain', `Le projet ${project.name} est ${statusDict.locked[String(!!project.locked)].wording}`)
            cy.getSettled('td:nth-of-type(6)').should('contain', 'il y a 1 an') // ça va être rigolo quand ce code sera outdated
          })
        })
      })
  })

  it('Should display filtered projects, loggedIn as admin', () => {
    cy.intercept('GET', /api\/v1\/projects\?filter=all$/).as('getAllProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusNotIn=archived').as('getActiveProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=archived').as('getArchivedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=failed').as('getFailedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&locked=true&statusNotIn=archived').as('getLockedProjects')
    cy.intercept('GET', 'api/v1/organizations').as('getOrganizations')

    cy.get('select#tableAdministrationProjectsFilter').select('Tous')
    cy.wait('@getAllProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Archivés')
    cy.wait('@getArchivedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Non archivés')
    cy.wait('@getActiveProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Échoués')
    cy.wait('@getFailedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Verrouillés')
    cy.wait('@getLockedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })
  })

  it('Should replay hooks for a project, loggedIn as admin', () => {
    const project = projects.find(p => p.name === 'candilib')

    cy.intercept('PUT', `/api/v1/projects/${project.id}/hooks`).as('replayHooks')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.getByDataTestid('replayHooksBtn')
      .should('contain', 'Reprovisionner le projet')
      .click()

    cy.wait('@replayHooks').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should lock and unlock a project, loggedIn as admin', () => {
    const project = projects[0]

    cy.intercept('PUT', `/api/v1/projects/${project.id}`).as('handleProjectLocking')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.getByDataTestid('handleProjectLockingBtn')
      .should('contain', project.locked ? 'Déverrouiller le projet' : 'Verrouiller le projet')
      .click()
    cy.wait('@handleProjectLocking')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.getByDataTestid('handleProjectLockingBtn')
      .should('contain', 'Déverrouiller le projet')
      .click()
    cy.wait('@handleProjectLocking')
      .its('response.statusCode')
      .should('match', /^20\d$/)
  })

  it('Should archive a project, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('DELETE', 'api/v1/projects/*').as('archiveProject')

    const projectName = 'adminarchive'

    cy.createProject({ name: projectName }, admin?.email)

    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects')
    cy.get('select#tableAdministrationProjectsFilter').select('Tous')
    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(projectName)
        .click()
    })
    cy.wait('@listQuotas')
    cy.get('.fr-callout__title')
      .should('contain', projectName)
    cy.getByDataTestid('archiveProjectInput').should('not.exist')
      .getByDataTestid('showArchiveProjectBtn').click()
      .getByDataTestid('archiveProjectBtn')
      .should('be.disabled')
      .getByDataTestid('archiveProjectInput').should('be.visible')
      .type(projectName)
      .getByDataTestid('archiveProjectBtn')
      .should('be.enabled')
      .click()
    cy.wait('@archiveProject')
      .its('response.statusCode')
      .should('match', /^20\d$/)
  })

  it('Should update an environment quota, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects?filter=all&statusNotIn=archived').as('getAllProjects')
    cy.intercept('GET', 'api/v1/environments?projectId=*').as('getProjectEnvironments')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('GET', 'api/v1/stages').as('listStages')
    cy.intercept('POST', '/api/v1/quotas').as('createQuota')
    cy.intercept('PUT', 'api/v1/environments/*').as('updateEnvironment')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains('betaapp')
        .click()
    })

    cy.get('select#quota-select:first')
      .should('be.enabled')
      .should('have.value', '5a57b62f-2465-4fb6-a853-5a751d099199')
      .select(2)
    cy.getByDataTestid('refresh-btn')
    cy.get('select#quota-select:first')
      .should('be.enabled')
      .should('have.value', '08770663-3b76-4af6-8978-9f75eda4faa7')
      .select(1)
    cy.get('select#quota-select:first')
      .should('be.enabled')
      .should('have.value', '5a57b62f-2465-4fb6-a853-5a751d099199')
  })

  it('Should remove and add a user from a project, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp') as ProjectV2
    const member = project.members[0]

    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.intercept('DELETE', `api/v1/projects/${project.id}/members/${member.userId}`).as('removeUser')
    cy.intercept('POST', `api/v1/projects/${project.id}/members`).as('addUser')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.get(`td[title="Quitter le projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.get(`td[title="Quitter le projet"]`)
      .should('not.exist')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(member.email)
    cy.getByDataTestid('addUserBtn')
      .click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.get(`td[title="Quitter le projet"]`)
      .should('exist')
  })

  it('Should transfert owner role to a team member, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp') as ProjectV2
    const owner = project.owner
    const userToTransfer = project.members[0]

    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.intercept('GET', `api/v1/projects/${project.id}/services?permissionTarget=admin`).as('getServices')
    cy.intercept('GET', 'api/v1/repositories?projectId=*').as('listRepositories')
    cy.intercept('GET', 'api/v1/environments?projectId=*').as('listEnvironments')
    cy.intercept('PUT', `/api/v1/projects/${project.id}`).as('transferOwnership')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })

    cy.wait('@getServices')
    cy.wait('@listRepositories')
    cy.wait('@listEnvironments')

    cy.get('.fr-callout__title')
      .should('contain', project.name)

    cy.getByDataTestid('showTransferProjectBtn')
      .should('be.enabled')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn').click()
    cy.getByDataTestid('transferProjectBtn')
      .should('exist')
      .should('be.disabled')
    cy.get('#nextOwnerSelect').select(userToTransfer.userId)
    cy.getByDataTestid('transferProjectBtn')
      .should('be.enabled')
      .click()
    cy.wait('@transferOwnership')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire')
      .should('have.length', 1)
      .parent()
      .parent()
      .should('contain', userToTransfer.email)

    cy.getByDataTestid('showTransferProjectBtn').click()
    cy.getByDataTestid('transferProjectBtn')
      .should('exist')
      .should('be.disabled')
    cy.get('#nextOwnerSelect').select(owner.id)
    cy.getByDataTestid('transferProjectBtn')
      .should('be.enabled')
      .click()
    cy.wait('@transferOwnership')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire')
      .should('have.length', 1)
      .parent()
      .parent()
      .should('contain', owner.email)
  })

  it('Should access project services, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp')

    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')

    cy.getByDataTestid('tableAdministrationProjects', 15_000).within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.get('#servicesTable').should('exist')
    cy.getByDataTestid('service-config-argocd')
      .click()
      .within(() => {
        cy.get('input')
          .should('have.length', 1)
      })
  })

  it('Should download projects informations, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.get('.fr-link--download').should('not.exist')
    cy.getByDataTestid('download-btn')
      .click()
    cy.get('.fr-link--download').should('exist')
      .click()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/CSV – \d* bytes/)
      })
  })
})
