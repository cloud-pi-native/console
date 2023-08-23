import { getModelById } from '../support/func.js'
import { statusDict } from 'shared'

describe('Dashboard', () => {
  const projectToArchive = getModelById('project', '9dabf3f9-6c86-4358-8598-65007d78df65')
  const projectToKeep = getModelById('project', '22e7044f-8414-435d-9c4a-2df42a65034b')
  const projectFailed = getModelById('project', '83833faf-f654-40dd-bcd5-cf2e944fc702')
  const projectCreated = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const permissions = [{
    email: owner.email,
    isOwner: true,
  },
  {
    email: user.email,
    isOwner: false,
  }]
  const environmentNames = projectToKeep.environments.map(environment => environment.name)

  before(() => {
    cy.kcLogin('test')

    cy.assertCreateProjects([projectToKeep.name, projectCreated.name, projectFailed.name])
  })

  it('Should display project statuses', () => {
    const projects = [projectCreated, projectFailed]

    cy.kcLogin('test')
    projects.forEach(project => {
      cy.goToProjects()
        .getByDataTestid(`projectTile-${project.name}`).click()
        .getByDataTestid('menuDashboard').click()
        .getByDataTestid(`${project.id}-${project.status}-badge`)
        .should('contain', `Projet ${project.name} : ${statusDict.status[project.status]?.wording}`)
        .getByDataTestid(`${project.id}-${project.locked ? '' : 'un'}locked-badge`)
        .should('contain', `Projet ${project.name} : ${statusDict.locked[project.locked]?.wording}`)

      project.repositories?.forEach(repository => {
        cy.get(`[data-testid$="-${repository.status}-badge"]`)
          .should('contain', `Dépôt ${repository.internalRepoName} : ${statusDict.status[repository.status]?.wording}`)
      })

      project.environments?.forEach(environment => {
        cy.get(`[data-testid$="-${environment.status}-badge"]`)
          .should('contain', `Environnement ${environment.name} : ${statusDict.status[environment.status]?.wording}`)
      })
    })
  })

  it('Should add, display and edit description', () => {
    cy.intercept('PUT', `/api/v1/projects/${projectToKeep.id}`).as('updateProject')
    const description1 = 'Application de prise de rendez-vous en préfécture.'
    const description2 = 'Application d\'organisation de tournois de pétanque interministériels.'

    cy.kcLogin('test')
      .goToProjects()
      .getByDataTestid(`projectTile-${projectToKeep.name}`).click()
      .getByDataTestid('menuDashboard').click()
      .getByDataTestid('descriptionP').should('have.class', 'disabled')
      .getByDataTestid('setDescriptionBtn').click()
      .getByDataTestid('descriptionInput').clear().type(description1)
      .getByDataTestid('saveDescriptionBtn').click()
      .wait('@updateProject').its('response.statusCode').should('eq', 200)
      .getByDataTestid('descriptionP').should('contain', description1)
      .getByDataTestid('setDescriptionBtn').click()
      .getByDataTestid('descriptionInput').clear().type(description2)
      .getByDataTestid('saveDescriptionBtn').click()
      .wait('@updateProject').its('response.statusCode').should('eq', 200)
      .getByDataTestid('descriptionP').should('contain', description2)
      .getByDataTestid('setDescriptionBtn').click()
      .getByDataTestid('descriptionInput').clear()
      .getByDataTestid('saveDescriptionBtn').click()
      .wait('@updateProject').its('response.statusCode').should('eq', 200)
      .getByDataTestid('descriptionP').should('have.class', 'disabled')
  })

  it('Should not be able to archive a project if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())

    cy.goToProjects()
      .getByDataTestid(`projectTile-${projectCreated.name}`).click()
      .getByDataTestid('menuDashboard').click()

    cy.url().should('contain', 'dashboard')
      .getByDataTestid('archiveProjectZone').should('not.exist')
  })

  it('Should archive project as owner without impacting other projects', () => {
    cy.kcLogin('test')
    cy.archiveProject(projectToArchive)
    cy.assertCreateProjects([projectToKeep.name, projectCreated.name, projectFailed.name])
    cy.assertAddRepo(projectToKeep, projectToKeep.repositories)
    cy.assertUsers(projectToKeep, [owner.email, user.email])
    cy.assertAddEnvironment(projectToKeep, environmentNames)
    cy.assertPermission(projectToKeep, environmentNames[0], permissions)
  })
})
