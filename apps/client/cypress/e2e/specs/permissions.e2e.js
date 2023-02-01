import {
  getProjectbyId,
  getUserById,
} from '../support/func.js'

describe('Manage permissions for environment', () => {
  const project = getProjectbyId('011e7860-04d7-461f-912d-334c622d38b3')
  const owner = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
  const user0 = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const user1 = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6567')

  before(() => {
    cy.kcLogin('test')

    cy.goToProjects()

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project.name}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should not be able to update permissions if not permitted on environment', () => {
    const environment = 'staging'

    cy.kcLogin((user0.firstName.slice(0, 1) + user0.lastName).toLowerCase())
      .goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${environment}`)
      .click()
      .url().should('contain', '/environments')
      .getByDataTestid('deleteEnvironmentZone').should('not.exist')

    cy.assertPermission(project, environment, [{ email: owner.email, isOwner: true }])

    cy.getByDataTestid('permissionSuggestionInput').find('input')
      .should('be.disabled')
      .getByDataTestid('deletePermissionBtn')
      .should('be.disabled')
      .getByDataTestid('permissionLevelRange')
      .should('be.disabled')
  })

  it('Should add permissions to an existing environment', () => {
    const environment = 'staging'

    cy.assertAddEnvironment(project, [environment])
    cy.addPermission(project, environment, user0.email)
    cy.assertPermission(project, environment, [{ email: owner.email, isOwner: true }, { email: user0.email, isOwner: false }])

    cy.getByDataTestid('permissionSuggestionInput')
      .should('not.exist')

    cy.addProjectMember(project, user1.email)

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuEnvironments').click()
      .getByDataTestid(`environmentTile-${environment}`)
      .click()

    cy.get('[data-testid^="userPermissionLi-"]')
      .should('have.length', 2)
      .getByDataTestid('permissionSuggestionInput').first()
      .should('be.visible')
      .clear()

    cy.addPermission(project, environment, user1.email)
    cy.getByDataTestid(`userPermissionLi-${user1.email}`)
      .should('exist')
  })

  it.skip('Should update existing permissions', () => {
    cy.intercept('PUT', `/api/v1/projects/${project.id}/environments/*/permissions`).as('putPermission')
    const environment = 'staging'

    cy.assertAddEnvironment(project, [environment])
    cy.assertPermission(project, environment, [{ email: owner.email, isOwner: true }, { email: user0.email, isOwner: false }, { email: user1.email, isOwner: false }])

    cy.getByDataTestid('permissionSuggestionInput')
      .should('not.exist')

    // TODO : Interragir avec input[type=range]
    // https://docs.cypress.io/api/commands/trigger#Interact-with-a-range-input-slider
    cy.getByDataTestid(`userPermissionLi-${user1.email}`).within(() => {
      cy.getByDataTestid('permissionLevelRange')
        .find('input[type=range]')
        .invoke('val', 0)
        .trigger('change')
    })
      .wait('@putPermission')
      .its('response.statusCode').should('eq', 200)
  })

  it('Should remove a permission', () => {
    cy.intercept('DELETE', `/api/v1/projects/${project.id}/environments/*/permissions/${user1.id}`).as('deletePermission')
    const environment = 'staging'

    cy.assertAddEnvironment(project, [environment])
    cy.assertPermission(project, environment, [{ email: owner.email, isOwner: true }, { email: user0.email, isOwner: false }, { email: user1.email, isOwner: false }])

    cy.getByDataTestid('permissionSuggestionInput')
      .should('not.exist')

    cy.getByDataTestid(`userPermissionLi-${user1.email}`).within(() => {
      cy.getByDataTestid('deletePermissionBtn')
        .click()
    })
      .wait('@deletePermission')
      .its('response.statusCode').should('eq', 200)

    cy.get('[data-testid^="userPermissionLi-"]')
      .should('have.length', 2)
      .getByDataTestid('permissionSuggestionInput')
      .should('be.visible')
      .getByDataTestid(`userPermissionLi-${user1.email}`)
      .should('not.exist')
  })
})
