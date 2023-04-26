import { getProjectbyId, getUserById } from '../support/func.js'

describe('Dashboard', () => {
  const projectToArchive = getProjectbyId('9dabf3f9-6c86-4358-8598-65007d78df65')
  const projectToKeep = getProjectbyId('22e7044f-8414-435d-9c4a-2df42a65034b')
  const projectFailed = getProjectbyId('83833faf-f654-40dd-bcd5-cf2e944fc702')
  const projectCreated = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')
  const owner = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
  const user = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
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

  it('Should display project status', () => {
    cy.kcLogin('test')
      .goToProjects()
      .getByDataTestid(`projectTile-${projectCreated.name}`).click()
      .getByDataTestid('menuDashboard').click()
      .getByDataTestid(`${projectCreated.status}-badge`)
      .should('contain', 'Projet correctement déployé')

      .goToProjects()
      .getByDataTestid(`projectTile-${projectFailed.name}`).click()
      .getByDataTestid('menuDashboard').click()
      .getByDataTestid(`${projectFailed.status}-badge`)
      .should('contain', 'Echec des opérations')
  })

  it('Should add, display and edit description', () => {
    cy.intercept('PUT', `/api/v1/projects/${projectToKeep.id}`).as('updateProject')
    const description1 = 'Application de prise de rendez-vous en préfécture.'
    const description2 = 'Application d\'organisation de tournois de pétanque interministériels.'

    cy.kcLogin('test')
      .goToProjects()
      .getByDataTestid(`projectTile-${projectToKeep.name}`).click()
      .getByDataTestid('menuDashboard').click()
      .getByDataTestid('descriptionP').should('not.exist')
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
      .getByDataTestid('descriptionP').should('not.exist')
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
