import { statusDict, formatDate, sortArrByObjKeyAsc, type Organization, type Project, ProjectV2 } from '@cpn-console/shared'
import { getModel, getModelById } from '../../support/func.js'

const checkTableRowsLength = (length: number) => {
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
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')

    cy.kcLogin((admin.firstName.slice(0, 1) + admin.lastName).toLowerCase())
    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects', { timeout: 10_000 }).its('response').then((response) => {
      projects = mapProjects(response?.body)
    })
  })

  it('Should display projects table, loggedIn as admin', () => {
    cy.get('select#tableAdministrationProjectsFilter').select('Tous')
    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      projects.forEach((project, index: number) => {
        cy.get(`tbody tr:nth-of-type(${index + 1})`).within(() => {
          cy.get('td:nth-of-type(1)').should('contain', project.organization)
          cy.get('td:nth-of-type(2)').should('contain', project.name)
          cy.getByDataTestid('description').invoke('text').then((text) => {
            const maxDescriptionlength = 60
            if (text?.length > maxDescriptionlength) {
              const lastSpaceIndex = project.description.slice(0, maxDescriptionlength).lastIndexOf(' ')
              const truncatedDescription = project.description.slice(0, lastSpaceIndex > 0 ? lastSpaceIndex : maxDescriptionlength)
              expect(text).to.equal(`${truncatedDescription} ...`)
              return
            }
            expect(text).to.equal(project.description)
          })
          cy.get('td:nth-of-type(4)').should('contain', project.owner.email)
          cy.get('td:nth-of-type(5) svg title').should('contain', `Le projet ${project.name} est ${statusDict.status[project.status].wording}`)
          cy.get('td:nth-of-type(6) svg title').should('contain', `Le projet ${project.name} est ${statusDict.locked[String(!!project.locked)].wording}`)
          cy.get('td:nth-of-type(7)').should('contain', formatDate(project.createdAt))
          cy.get('td:nth-of-type(8)').should('contain', formatDate(project.updatedAt))
        })
      })
    })
  })

  it.skip('Should display untruncated description when click on span, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.intercept('GET', 'api/v1/organizations').as('getOrganizations')

    cy.get('select#tableAdministrationProjectsFilter').select('Tous')
    cy.wait('@getAllProjects')
    cy.wait('@getOrganizations')
    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      projects.forEach((project, index: number) => {
        cy.get(`tbody tr:nth-of-type(${index + 1})`).within(() => {
          cy.getByDataTestid('description').then(($span) => {
            if (Cypress.dom.isVisible($span)) cy.wrap($span).click()
          })
          cy.getByDataTestid('description').then(($span) => {
            if (Cypress.dom.isVisible($span)) cy.wrap($span).should('contain', project.description)
          })
        })
      })
    })
  })

  it('Should display filtered projects, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/projects?filter=all').as('getAllProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusNotIn=archived').as('getActiveProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=archived').as('getArchivedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&statusIn=failed').as('getFailedProjects')
    cy.intercept('GET', 'api/v1/projects?filter=all&locked=true&statusNotIn=archived').as('getLockedProjects')
    cy.intercept('GET', 'api/v1/organizations').as('getOrganizations')

    cy.get('select').select('Tous')
    cy.wait('@getAllProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Archivés')
    cy.wait('@getAllProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Non archivés')
    cy.wait('@getActiveProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Archivés')
    cy.wait('@getArchivedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Échoués')
    cy.wait('@getFailedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })

    cy.get('select#tableAdministrationProjectsFilter').select('Vérrouillés')
    cy.wait('@getLockedProjects').its('response').then((response) => {
      cy.getByDataTestid('tableAdministrationProjects').within(() => checkTableRowsLength(response.body.length))
    })
  })

  it('Should replay hooks for a project, loggedIn as admin', () => {
    const project = projects[0]

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
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Le projet ayant pour id ${project.id} a été reprovisionné avec succès`)
    })
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
    // cy.getByDataTestid('tableAdministrationProjects')
    //   .should('be.visible')
    //   .within(() => {
    //     cy.get('tr').contains(projectName)
    //       .click()
    //   })
    // cy.getByDataTestid('snackbar').within(() => {
    //   cy.get('p').should('contain', 'Le projet est archivé, pas d\'action possible')
    // })
    // cy.getByDataTestid('tableAdministrationProjects')
    //   .should('be.visible')
  })

  it('Should update an environment quota, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp')
    const privateQuota = {
      id: '',
      name: 'XXXXLprivate',
      memory: '20Gi',
      cpu: '5',
      stage: [getModelById('stage', '4a9ad694-4c54-4a3c-9579-548bf4b7b1b9')],
    }
    let initialQuota = ''

    cy.intercept('GET', 'api/v1/projects?filter=all&statusNotIn=archived').as('getAllProjects')
    cy.intercept('GET', 'api/v1/environments?projectId=*').as('getProjectEnvironments')
    cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
    cy.intercept('GET', 'api/v1/stages').as('listStages')
    cy.intercept('POST', '/api/v1/quotas').as('createQuota')
    cy.intercept('PUT', 'api/v1/environments/*').as('updateEnvironment')

    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects', { timeout: 10_000 }).its('response').then((pResponse) => {
      projects = mapProjects(pResponse.body)
    })

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })

    cy.wait('@getProjectEnvironments', { timeout: 10_000 }).its('response').then((response) => {
      project.environments = response.body
      initialQuota = project.environments[0].quotaId
    })

    cy.visit('/admin/quotas')
    cy.url().should('contain', '/admin/quotas')
    cy.wait('@listQuotas')
    cy.wait('@listStages')
    cy.getByDataTestid('addQuotaLink')
      .should('be.visible')
      .click()
    cy.getByDataTestid('nameInput')
      .type(privateQuota.name)
    cy.getByDataTestid('memoryInput')
      .type(privateQuota.memory)
    cy.getByDataTestid('cpuInput')
      .type(privateQuota.cpu)
    cy.getByDataTestid('input-checkbox-isQuotaPrivateCbx')
      .check({ force: true })
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
    cy.get('#stages-select')
      .click()
    privateQuota.stage.forEach((stage) => {
      cy.getByDataTestid(`${stage.id}-stages-select-tag`)
        .click()
    })
    cy.getByDataTestid('addQuotaBtn')
      .click()

    cy.wait('@createQuota').then(({ response }) => {
      privateQuota.id = response?.body?.id
      expect(response?.statusCode).to.match(/^20\d$/)

      cy.visit('/admin/projects')
      cy.url().should('contain', '/admin/projects')
      cy.wait('@getAllProjects', { timeout: 10_000 }).its('response').then((pResponse) => {
        projects = mapProjects(pResponse.body)
      })

      cy.getByDataTestid('tableAdministrationProjects').within(() => {
        cy.get('tr').contains(project.name)
          .click()
      })
      cy.wait('@listQuotas')
      cy.get('.fr-callout__title')
        .should('contain', project.name)
      cy.get('select#quota-select:first')
        .should('have.value', initialQuota)
        .and('be.enabled')
      cy.get('select#quota-select:first')
        .select(privateQuota.id)
      cy.wait('@updateEnvironment')
        .its('response.statusCode')
        .should('match', /^20\d$/)
      cy.wait('@getAllProjects')
      cy.wait('@listQuotas')
      cy.get('select#quota-select:first')
        .should('have.value', privateQuota.id)
        .and('be.enabled')
      cy.reload()
      cy.getByDataTestid('tableAdministrationProjects').within(() => {
        cy.get('tr').contains(project.name)
          .click()
      })
      cy.wait('@listQuotas')
      cy.get('select#quota-select:first')
        .select(initialQuota)
      cy.wait('@updateEnvironment')
        .its('response.statusCode')
        .should('match', /^20\d$/)
      cy.wait('@getAllProjects')
    })
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
    cy.get(`td[title="retirer ${member.email} du projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)
    cy.get(`td[title="retirer ${member.email} du projet"]`)
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
    cy.get(`td[title="retirer ${member.email} du projet"]`)
      .should('exist')
  })

  it.skip('Should transfert owner role to a team member, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp') as ProjectV2
    const owner = project.owner
    const userToTransfer = project.members[0]

    cy.intercept('PUT', `/api/v1/projects/${project.id}`).as('transferOwnership')
    cy.intercept('GET', `/api/v1/projects?filter=member&statusNotIn=archived`).as('getProjectMembers')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)

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
    cy.wait('@getProjectMembers')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')

    cy.kcLogin((userToTransfer.firstName.slice(0, 1) + userToTransfer.lastName).toLowerCase())

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)

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
      cy.wait('@getProjectMembers')
        .its('response.statusCode')
        .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable').get('tr').contains('Propriétaire').should('have.length', 1)
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('transferProjectBtn')
      .should('not.exist')
  })
  it.only('Should transfert owner role to a team member, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'betaapp') as ProjectV2
    const owner = project.owner
    const userToTransfer = project.members[0]

    cy.intercept('GET', 'api/v1/projects*').as('getAllProjects')
    cy.intercept('GET', `api/v1/project/${project.id}/services?permissionTarget=admin`).as('getServices')
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

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.get('#servicesTable').should('exist')
    cy.getByDataTestid('service-argocd').within(() => {
      cy.get('a:first')
        .should('have.attr', 'href', 'https://theuselessweb.com/')
      cy.get('img:first')
        .should('have.attr', 'src', '/img/argocd.svg')
    })
  })

  it('Should download projects informations, loggedIn as admin', () => {
    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
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
