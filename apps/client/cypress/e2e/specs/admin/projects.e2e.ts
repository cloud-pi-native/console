import type { ProjectV2 } from '@cpn-console/shared'
import { sortArrByObjKeyAsc, statusDict } from '@cpn-console/shared'
import { getModelById } from '../../support/func.js'
import type { Project } from '@/utils/project-utils.js'

describe('Administration projects', () => {
  const admin = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  let projects: ProjectV2[]

  const mapProjects = (body: Project[]) => {
    return sortArrByObjKeyAsc(body, 'name')
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
    cy.get('select#projectSearchFilter').select('Tous')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getAllProjects').its('response').then((response) => {
      const projects = response.body
      cy.getByDataTestid('tableAdministrationProjects')
        .get('tbody tr')
        .should('have.length.at.least', 2)
      projects.forEach((project: Project) => {
        cy.getByDataTestid(`tr-${project.id}`)
          .within(() => {
            cy.get('td:nth-of-type(2)').should('contain', project.slug)
            cy.get('td:nth-of-type(3)').should('contain', project.name)
            cy.get('td:nth-of-type(4)').should('contain', project.owner.email)
            cy.get('td:nth-of-type(5)').invoke('attr', 'title').should('contain', statusDict.status[project.status].wording)
            cy.get('td:nth-of-type(5)').invoke('attr', 'title').should('contain', statusDict.locked[String(!!project.locked)].wording)
            cy.get('td:nth-of-type(6)').should('contain.text', project.lastSuccessProvisionningVersion)
            cy.get('td:nth-of-type(7)').should('contain.text', 'il y a')
          })
      })
    })
  })

  it('Should display handle multi-select and bulk actions, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.wait('@getAllProjects')

    // attente que les lignes soient bien rendus
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr')
      .should('not.have.text', 'Chargement...')

    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr')
      .should('not.have.attr', 'selected')
    cy.getByDataTestid('select-all-cbx')
      .check()
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr')
      .should('have.attr', 'selected')
    cy.getByDataTestid('select-all-cbx')
      .check()
    cy.getByDataTestid(`tr-${projects[1].id}`)
      .click()
      .should('not.have.attr', 'selected')
    cy.getByDataTestid('select-all-cbx')
      .should('not.be.checked')
    cy.getByDataTestid(`tr-${projects[1].id}`)
      .click()
      .should('have.attr', 'selected')
    cy.getByDataTestid('select-all-cbx')
      .should('be.checked')

    // count must appear
    cy.getByDataTestid('projectSelectedCount')
      .should('contain.text', 'projets')
    // filter by partial name
    cy.getByDataTestid('projectsSearchInput')
      .clear()
      .type('li')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    // count must equal only displayed element
    cy.getByDataTestid('projectSelectedCount')
      .should('contain.text', '3 projets')
    // verrouillage des projets
    cy.getByDataTestid('selectBulkAction')
      .select('lock')
    cy.getByDataTestid('validateBulkAction')
      .click()
    cy.getByDataTestid('snackbar').should('contain', `Traitement en cours`)
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr')
      .should('not.have.attr', 'selected')
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr > td:nth-of-type(5)')
      .invoke('attr', 'title')
      .should('contain', statusDict.locked.true.wording)
    // annulation de la modification
    cy.getByDataTestid('select-all-cbx')
      .check()
    cy.getByDataTestid('projectSelectedCount')
      .should('contain.text', '3 projets')
    cy.getByDataTestid('selectBulkAction')
      .select('unlock')
    cy.getByDataTestid('validateBulkAction')
      .click()
    cy.getByDataTestid('snackbar').should('contain', `Traitement en cours`)
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr')
      .should('not.have.attr', 'selected')
    cy.getByDataTestid('tableAdministrationProjects')
      .get('tbody > tr > td:nth-of-type(5)')
      .invoke('attr', 'title')
      .should('contain', statusDict.locked.false.wording)
  })

  it('Should display filtered projects, loggedIn as admin', () => {
    cy.intercept('GET', /api\/v1\/projects\?filter=all$/).as('getAllProjects')
    cy.intercept('GET', /api\/v1\/projects\?filter=all&search=pr$/).as('searchInputProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusNotIn=archived').as('getActiveProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=archived').as('getArchivedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=failed').as('getFailedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&locked=true&statusNotIn=archived').as('getLockedProjects')

    cy.get('select#projectSearchFilter').select('Tous')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getAllProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
    })

    cy.get('select#projectSearchFilter').select('Archivés')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getArchivedProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
    })

    cy.get('select#projectSearchFilter').select('Non archivés')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getActiveProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
    })

    cy.get('select#projectSearchFilter').select('Échoués')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getFailedProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
    })

    cy.get('select#projectSearchFilter').select('Verrouillés')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@getLockedProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
    })

    cy.get('select#projectSearchFilter').select('Tous')
    cy.getByDataTestid('projectsSearchInput')
      .clear()
      .type('pr')
    cy.getByDataTestid('projectsSearchBtn')
      .click()
    cy.wait('@searchInputProjects').its('response').then((response) => {
      cy.checkTableBody('tableAdministrationProjects', response.body.length, 'Aucun projet trouvé')
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
    cy.getByDataTestid('test-tab-team').click()
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.get(`div[title="Quitter le projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.get(`div[title="Quitter le projet"]`)
      .should('not.exist')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .as('inputAddUser')
    cy.get('@inputAddUser')
      .clear()
    cy.get('@inputAddUser')
      .type(member.email)
    cy.getByDataTestid('addUserBtn')
      .click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.get(`div[title="Quitter le projet"]`)
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
    cy.getByDataTestid('test-tab-team').click()

    cy.wait('@getServices')
    cy.wait('@listRepositories')
    cy.wait('@listEnvironments')

    cy.get('.fr-callout__title')
      .should('contain', project.name)

    cy.wait(500)
    cy.getByDataTestid('showTransferProjectBtn')
      .click()
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
    cy.getByDataTestid('test-tab-services').click()
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
