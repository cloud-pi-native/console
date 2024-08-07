import { getModelById } from '../support/func.js'

describe('Manage permissions for environment', () => {
  const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')
  const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
  const user0 = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')
  const user1 = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567')
  const user2 = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569')
  const environment = getModelById('environment', '1b9f1053-fcf5-4053-a7b2-ff8a2c0c1921')

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
    cy.kcLogin((user0.firstName.slice(0, 1) + user0.lastName).toLowerCase())
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuEnvironments').click()
    cy.url().should('contain', '/environments')
    cy.getByDataTestid(`environmentTile-${environment?.name}`)
      .click()
    cy.getByDataTestid('deleteEnvironmentZone').should('not.exist')

    cy.assertPermission(project, environment?.name, [{ email: owner.email, isOwner: true }])

    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.disabled')
    cy.getByDataTestid('deletePermissionBtn')
      .should('be.disabled')
    cy.getByDataTestid('permissionLevelRange')
      .find('input')
      .should('be.disabled')
  })

  it('Should add permissions to an existing environment', () => {
    cy.intercept('GET', '/api/v1/clusters').as('getClusters')
    cy.intercept('GET', '/api/v1/environments?projectId=*').as('listEnvironments')

    cy.assertAddEnvironment(project, [environment], false)
    cy.addPermission(project, environment?.name, user0.email)
    cy.addPermission(project, environment?.name, user2.email)
    cy.assertPermission(project, environment?.name, [
      { email: owner.email, isOwner: true },
      { email: user0.email, isOwner: false },
      { email: user2.email, isOwner: false },
    ])

    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.disabled')
    cy.getByDataTestid('newPermissionFieldset').within(() => {
      cy.get('.fr-hint-text')
        .should('contain', `Tous les membres du projet ${project.name} sont déjà accrédités.`)
    })

    cy.addProjectMember(project, user1.email)

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuEnvironments').click()
    cy.wait('@listEnvironments')
    cy.getByDataTestid(`environmentTile-${environment?.name}`)
      .click()

    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.enabled')
    cy.getByDataTestid('newPermissionFieldset').within(() => {
      cy.get('.fr-hint-text')
        .should('contain', `Entrez l'e-mail d'un membre du projet ${project.name}. Ex : ${user1.email}`)
    })

    cy.get('[data-testid^="userPermissionLi-"]')
      .should('have.length', 3)
    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.visible')
      .clear()

    cy.addPermission(project, environment?.name, user1.email)
    cy.getByDataTestid(`userPermissionLi-${user1.email}`)
      .should('exist')
  })

  it('Should update existing permissions', () => {
    cy.kcLogin('test')
    cy.intercept('PUT', `/api/v1/projects/${project.id}/environments/*/permissions`).as('putPermission')

    cy.assertAddEnvironment(project, [environment], false)
    cy.assertPermission(project, environment?.name, [{ email: owner.email, isOwner: true }, { email: user0.email, isOwner: false }])

    cy.getByDataTestid(`${user0.id}UpsertPermissionBtn`)
      .should('be.disabled')

    cy.getByDataTestid(`userPermissionLi-${user0.email}`).within(() => {
      cy.getByDataTestid('permissionLevelRange')
        .find('input')
        .invoke('val', 2)
        .trigger('input')
    })
    cy.getByDataTestid(`${user0.id}UpsertPermissionBtn`)
      .should('be.enabled')
      .click()
    cy.wait('@putPermission')
      .its('response.statusCode').should('match', /^20\d$/)

    cy.reload()

    cy.getByDataTestid(`environmentTile-${environment?.name}`)
      .click()

    cy.getByDataTestid(`userPermissionLi-${user0.email}`).within(() => {
      cy.getByDataTestid('permissionLevelRange')
        .find('input')
        .should('have.value', 2)
    })
  })

  it('Should remove a permission', () => {
    cy.intercept('GET', 'api/v1/clusters').as('getClusters')
    cy.intercept('DELETE', `/api/v1/projects/${project.id}/environments/*/permissions/${user2.id}`).as('deletePermission')

    cy.assertAddEnvironment(project, [environment], false)
    cy.assertPermission(project, environment?.name, [{ email: owner.email, isOwner: true }, { email: user0.email, isOwner: false }, { email: user2.email, isOwner: false }])

    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.disabled')
    cy.getByDataTestid('newPermissionFieldset').within(() => {
      cy.get('.fr-hint-text')
        .should('contain', `Tous les membres du projet ${project.name} sont déjà accrédités.`)
    })

    cy.getByDataTestid(`userPermissionLi-${user2.email}`).within(() => {
      cy.getByDataTestid('deletePermissionBtn')
        .click()
    })
      .wait('@deletePermission')
      .its('response.statusCode').should('match', /^20\d$/)

    cy.get('[data-testid^="userPermissionLi-"]')
      .should('have.length', 3)
    cy.getByDataTestid('permissionSuggestionInput')
      .find('input')
      .should('be.enabled')
    cy.getByDataTestid('newPermissionFieldset').within(() => {
      cy.get('.fr-hint-text')
        .should('contain', `Entrez l'e-mail d'un membre du projet ${project.name}. Ex : ${user2.email}`)
    })
      .getByDataTestid(`userPermissionLi-${user2.email}`)
      .should('not.exist')

    cy.kcLogin((user2.firstName.slice(0, 1) + user2.lastName).toLowerCase())
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuEnvironments').click()
    cy.wait('@getClusters')
    cy.getByDataTestid(`environmentTile-${environment?.name}`)
      .click()
    cy.url().should('contain', '/environments')
    cy.getByDataTestid('notPermittedAlert')
      .should('be.visible')
  })
})
