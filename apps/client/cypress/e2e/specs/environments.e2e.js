
import { getProjectbyId, getUserById } from '../support/func.js'

describe('Add environments into project', () => {
  const project0 = { name: 'project11' }
  const project1 = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')
  const user = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const environments = ['prod', 'staging']

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project0)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project0.name}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should add environments to an existing project', () => {
    cy.addEnvironment(project0, environments)
    cy.assertAddEnvironment(project0, environments)
  })

  it('Should delete an environment', () => {
    cy.deleteEnvironment(project0, environments[1])
  })

  it('Should not be able to delete an environment if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project1.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${environments[0]}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')
  })
})
