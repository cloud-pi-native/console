import { getModel, getModelById } from '../../support/func'
import { statusDict, formatDate, sortArrByObjKeyAsc, OrganizationModel, ProjectModel } from '@dso-console/shared'

describe('Administration projects', () => {
  const admin = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const organizations = getModel('organization') as OrganizationModel[]
  let projects: unknown[]

  const mapProjects = (body: ProjectModel[]) => {
    return sortArrByObjKeyAsc(body, 'name')
      ?.map(project => ({
        ...project,
        owner: project.roles?.find(role => role.role === 'owner')?.user,
        organization: organizations.find(organization => organization.id === project.organizationId).label,
      }),
      )
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/projects').as('getAllProjects')

    cy.kcLogin((admin.firstName.slice(0, 1) + admin.lastName).toLowerCase())
    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects', { timeout: 10000 }).its('response').then(response => {
      projects = mapProjects(response.body)
    })
  })

  it('Should display projects table, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      projects.forEach((project, index: number) => {
        cy.get(`tbody tr:nth-of-type(${index + 1})`).within(() => {
          cy.get('td:nth-of-type(1)').should('contain', project.organization)
          cy.get('td:nth-of-type(2)').should('contain', project.name)
          cy.get('td:nth-of-type(3)').should('contain', project.description)
          cy.get('td:nth-of-type(4)').should('contain', project.owner.email)
          cy.get('td:nth-of-type(5) svg title').should('contain', `Le projet ${project.name} est ${statusDict.status[project.status].wording}`)
          cy.get('td:nth-of-type(6) svg title').should('contain', `Le projet ${project.name} est ${statusDict.locked[String(!!project.locked)].wording}`)
          cy.get('td:nth-of-type(7)').should('contain', formatDate(project.createdAt))
          cy.get('td:nth-of-type(8)').should('contain', formatDate(project.updatedAt))
        })
      })
    })
  })

  it('Should lock and unlock a project, loggedIn as admin', () => {
    const project = projects[0]

    cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
    cy.intercept('PATCH', `api/v1/admin/projects/${project.id}`).as('handleProjectLocking')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.wait('@getQuotas')
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.getByDataTestid('handleProjectLockingBtn')
      .should('contain', project.locked ? 'Déverrouiller le projet' : 'Verrouiller le projet')
      .click()
    cy.wait('@handleProjectLocking')
      .its('response.statusCode')
      .should('eq', 204)
    cy.getByDataTestid('handleProjectLockingBtn')
      .should('contain', 'Déverrouiller le projet')
      .click()
    cy.wait('@handleProjectLocking')
      .its('response.statusCode')
      .should('eq', 204)
  })

  it('Should archive a project, loggedIn as admin', () => {
    cy.intercept('GET', 'api/v1/admin/projects').as('getAllProjects')
    cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
    cy.intercept('DELETE', 'api/v1/projects/*').as('archiveProject')

    const projectName = 'admin-archive'

    cy.createProject({ name: projectName }, admin?.email)

    cy.visit('/admin/projects')
    cy.url().should('contain', '/admin/projects')
    cy.wait('@getAllProjects')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(projectName)
        .click()
    })
    cy.wait('@getQuotas')
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
      .should('eq', 204)
    cy.getByDataTestid('tableAdministrationProjects')
      .should('be.visible')
      .within(() => {
        cy.get('tr').contains(projectName)
          .click()
      })
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Le projet est archivé, pas d\'action possible')
    })
    cy.getByDataTestid('tableAdministrationProjects')
      .should('be.visible')
  })

  it('Should update an environment quota, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'beta-app')
    const privateQuota = {
      id: '',
      name: 'XXXXLprivate',
      memory: '20Gi',
      cpu: '5',
      stages: [getModelById('stage', project.environments[0].quotaStage.stage.id)],
    }
    const initialQuota = project.environments[0].quotaStage.quota.id

    cy.intercept('GET', 'api/v1/admin/projects').as('getAllProjects')
    cy.intercept('GET', 'api/v1/projects').as('getProjects')
    cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
    cy.intercept('GET', 'api/v1/stages').as('getStages')
    cy.intercept('POST', '/api/v1/admin/quotas').as('createQuota')
    cy.intercept('PUT', `api/v1/projects/${project.id}/environments/*`).as('updateEnvironment')

    cy.visit('/admin/quotas')
    cy.url().should('contain', '/admin/quotas')
    cy.wait('@getQuotas')
    cy.wait('@getStages')
    cy.getByDataTestid('addQuotaLink')
      .should('be.visible')
      .click()
    cy.getByDataTestid('nameInput')
      .find('input')
      .type(privateQuota.name)
    cy.getByDataTestid('memoryInput')
      .find('input')
      .type(privateQuota.memory)
    cy.getByDataTestid('cpuInput')
      .find('input')
      .type(privateQuota.cpu)
    cy.getByDataTestid('isQuotaPrivateCbx').find('input[type=checkbox]')
      .check({ force: true })
    cy.getByDataTestid('addQuotaBtn').should('be.enabled')
    privateQuota.stages.forEach(stage => {
      cy.get('#stages-select')
        .should('be.enabled')
        .select(stage.name)
    })
    cy.getByDataTestid('addQuotaBtn')
      .click()

    cy.wait('@createQuota').then(({ response }) => {
      privateQuota.id = response.body?.id
      expect(response.statusCode).to.equal(201)

      cy.visit('/admin/projects')
      cy.url().should('contain', '/admin/projects')
      cy.wait('@getAllProjects', { timeout: 10000 }).its('response').then(pResponse => {
        projects = mapProjects(pResponse.body)
      })

      cy.getByDataTestid('tableAdministrationProjects').within(() => {
        cy.get('tr').contains(project.name)
          .click()
      })
      cy.wait('@getQuotas')
      cy.get('.fr-callout__title')
        .should('contain', project.name)
      cy.get('select#quota-select:first')
        .should('have.value', initialQuota)
        .and('be.enabled')
      cy.get('select#quota-select:first')
        .select(privateQuota.id)
      cy.wait('@updateEnvironment')
        .its('response.statusCode')
        .should('eq', 200)
      cy.wait('@getAllProjects')
      cy.wait('@getQuotas')
      cy.get('select#quota-select:first')
        .should('have.value', privateQuota.id)
        .and('be.enabled')
      cy.reload()
      cy.getByDataTestid('tableAdministrationProjects').within(() => {
        cy.get('tr').contains(project.name)
          .click()
      })
      cy.wait('@getQuotas')
      cy.get('select#quota-select:first')
        .select(initialQuota)
      cy.wait('@updateEnvironment')
        .its('response.statusCode')
        .should('eq', 200)
      cy.wait('@getProjects')
      cy.wait('@getAllProjects')
      cy.wait('@getQuotas')
    })
  })

  it('Should remove and add a user from a project, loggedIn as admin', () => {
    const project = projects.find(project => project.name === 'beta-app')
    const user = project.roles.find(role => role.role !== 'owner')?.user

    cy.intercept('GET', 'api/v1/admin/projects').as('getAllProjects')
    cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
    cy.intercept('DELETE', `api/v1/projects/${project.id}/users/${user.id}`).as('removeUser')
    cy.intercept('POST', `api/v1/projects/${project.id}/users`).as('addUser')

    cy.getByDataTestid('tableAdministrationProjects').within(() => {
      cy.get('tr').contains(project.name)
        .click()
    })
    cy.wait('@getQuotas')
    cy.get('.fr-callout__title')
      .should('contain', project.name)
    cy.get(`td[title="retirer ${user.email} du projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('eq', 200)
    cy.get(`td[title="retirer ${user.email} du projet"]`)
      .should('not.exist')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(user.email)
    cy.getByDataTestid('addUserBtn')
      .click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('eq', 201)
    cy.get(`td[title="retirer ${user.email} du projet"]`)
      .should('exist')
  })
})
