import { getProjectbyId, getUserById } from '../support/func.js'

describe('Dashboard', () => {
  const projectToArchive = { name: 'project-to-archive' }
  const project = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')
  const owner = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
  projectToArchive.users = [owner]
  const user = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6566')

  before(() => {
    cy.kcLogin('test')

    cy.createProject(projectToArchive)
      .assertCreateProject(projectToArchive.name)
      .assertCreateProject(project.name)

    // TODO : deskip avec #66
    // cy.addProjectMember(projectToArchive, user.email)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${projectToArchive.name}`).click()
  })

  it.skip('Should not be able to archive a project if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuDashboard').click()

    cy.url().should('contain', 'dashboard')
      .getByDataTestid('archiveProjectZone').should('not.exist')
  })

  it('Should archive project as owner', () => {
    cy.kcLogin('test')
    cy.archiveProject(projectToArchive)
      .assertCreateProject(project.name)
  })
})
