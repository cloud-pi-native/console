import type { Environment, ProjectPermsKeys, ProjectRole, ProjectV2, Repo, User } from '@cpn-console/shared'
import { getModel, getModelById } from '../support/func.js'

const roles: ProjectRole[] = getModel('projectRole')
const user: User = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569')
const repositories: Repo[] = getModel('repository')
const environments: Environment[] = getModel('environment')

const newRole = {
  name: 'elo hell',
} satisfies Partial<ProjectRole>

const project = getModelById('project', '94c860ab-023f-4e6e-8a4e-ff41456e249b') as ProjectV2
const projectRoles = roles.filter(role => role.projectId === project.id)
const projectRepos = repositories.filter(repo => repo.projectId === project.id)
const projectEnvs = environments.filter(env => env.projectId === project.id)
const testRole = projectRoles.find(projectRole => projectRole.id === 'c77a1b96-377d-4aa3-bc94-65d4415f9599') as ProjectRole

function assignPerms() {
  // @ts-expect-error
  const perms: ProjectPermsKeys[] = this as ProjectPermsKeys[]
  cy.kcLogin('test')
  cy.goToProjects()
  cy.getByDataTestid(`projectTile-${project.name}`).click()
  cy.getByDataTestid('menuProjectRole').click()
  cy.get('[data-testid$="-tab"]').contains(testRole.name)
    .should('be.visible')
    .click()
  perms.forEach((key) => {
    cy.getByDataTestid(`input-checkbox-${key}-cbx`).check({ force: true })
  })
  cy.getByDataTestid('saveBtn')
    .should('be.enabled')
    .click()
}

describe('Project roles', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/v1/projects').as('listProjects')
    cy.intercept('POST', '/api/v1/projects/*/roles').as('createRole')
  })

  describe('Project roles, without perms', () => {
    it('Should create role without perms', () => {
      cy.kcLogin('test')
      cy.goToProjects()
      cy.getByDataTestid(`projectTile-${project.name}`).click()
      cy.getByDataTestid('menuProjectRole').click()
      projectRoles.forEach((role) => {
        cy.getByDataTestid(`${role.id}-tab`)
          .should('be.visible')
      })

      cy.getByDataTestid('addRoleBtn')
        .should('be.enabled')
        .click()
      cy.wait('@createRole')
        .its('response.statusCode').should('match', /^20\d$/)
      cy.getByDataTestid('snackbar').should('contain', 'Rôle ajouté')
      cy.getByDataTestid('saveBtn').should('be.disabled')
      cy.getByDataTestid('roleNameInput')
        .should('have.value', 'Nouveau rôle')
        .clear()
        .type(newRole.name)
      cy.getByDataTestid('saveBtn')
        .should('be.enabled')
        .click()
      cy.getByDataTestid('test-members').click()
      cy.getByDataTestid(`input-checkbox-${user.id}-cbx`).check({ force: true })
    })

    it('Should not grant perms', () => {
      cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      cy.goToProjects()
      cy.getByDataTestid(`projectTile-${project.name}`).click()

      cy.getByDataTestid('menuTeam').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/team`)
      cy.getByDataTestid('teamTable').get('th').contains('Retirer du projet').should('be.visible')
      cy.getByDataTestid('addUserSuggestionInput').should('not.exist')
      cy.getByDataTestid('showTransferProjectBtn').should('not.exist')

      cy.getByDataTestid('menuDashboard').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/dashboard`)
      cy.getByDataTestid('replayHooksBtn').should('not.exist')
      cy.getByDataTestid('showSecretsBtn').should('not.exist')

      cy.getByDataTestid('menuRepos').should('not.exist')
      cy.getByDataTestid('menuEnvironments').should('not.exist')
      cy.getByDataTestid('menuProjectRole').should('not.exist')
    })
  })

  describe('Project roles, with view perms', () => {
    const intermediatePermsOptions: ProjectPermsKeys[] = ['LIST_ENVIRONMENTS', 'LIST_REPOSITORIES']

    it('Should assign view perms', assignPerms.bind(intermediatePermsOptions))

    it('Should grant view perms', () => {
      cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      cy.goToProjects()
      cy.getByDataTestid(`projectTile-${project.name}`).click()

      cy.getByDataTestid('menuRepos').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/repositories`)
      cy.getByDataTestid('addRepoLink').should('be.disabled')
      cy.getByDataTestid(`repoTile-${projectRepos[0].internalRepoName}`).click()
      cy.getByDataTestid('syncRepoBtn').should('not.exist')
      cy.getByDataTestid('updateRepoBtn').should('not.exist')
      cy.getByDataTestid('showDeleteRepoBtn').should('not.exist')

      cy.getByDataTestid('menuEnvironments').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/environments`)
      cy.getByDataTestid('addEnvironmentLink').should('not.exist')
      cy.getByDataTestid(`environmentTile-${projectEnvs[0].name}`).click()
      cy.getByDataTestid('putEnvironmentBtn').should('not.exist')
      cy.getByDataTestid('showDeleteEnvironmentBtn').should('not.exist')

      cy.getByDataTestid('menuTeam').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/team`)
      cy.getByDataTestid('teamTable').get('th').contains('Retirer du projet').should('be.visible')
      cy.getByDataTestid('addUserSuggestionInput').should('not.exist')
      cy.getByDataTestid('showTransferProjectBtn').should('not.exist')

      cy.getByDataTestid('menuDashboard').should('be.visible').click()
      cy.url().should('contain', `/projects/${project.id}/dashboard`)
      cy.getByDataTestid('replayHooksBtn').should('not.exist')
      cy.getByDataTestid('showSecretsBtn').should('not.exist')

      cy.getByDataTestid('menuProjectRole').should('not.exist')
    })
  })

  describe('Project roles, with full access perms', () => {
    const fullPermsOptions: ProjectPermsKeys[][] = [
      ['MANAGE_ENVIRONMENTS', 'MANAGE_MEMBERS', 'MANAGE_REPOSITORIES', 'MANAGE_ROLES', 'REPLAY_HOOKS', 'SEE_SECRETS'],
      ['MANAGE'],
    ]

    fullPermsOptions.forEach((perms, idx) => {
      it(`Should assign full access perms (${idx + 1})`, assignPerms.bind(perms))

      it(`Should grant full access perms (${idx + 1})`, () => {
        cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
        cy.goToProjects()
        cy.getByDataTestid(`projectTile-${project.name}`).click()

        cy.getByDataTestid('menuRepos').should('be.visible').click()
        cy.url().should('contain', `/projects/${project.id}/repositories`)
        cy.getByDataTestid('addRepoLink').should('be.enabled')
        cy.getByDataTestid(`repoTile-${projectRepos[0].internalRepoName}`).click()
        cy.getByDataTestid('syncRepoBtn').should('be.enabled')
        cy.getByDataTestid('updateRepoBtn').should('be.enabled')
        cy.getByDataTestid('showDeleteRepoBtn').should('be.enabled')

        cy.getByDataTestid('menuEnvironments').should('be.visible').click()
        cy.url().should('contain', `/projects/${project.id}/environments`)
        cy.getByDataTestid('addEnvironmentLink').should('be.enabled')
        cy.getByDataTestid(`environmentTile-${projectEnvs[0].name}`).click()
        cy.getByDataTestid('putEnvironmentBtn').should('be.enabled')
        cy.getByDataTestid('showDeleteEnvironmentBtn').should('be.enabled')

        cy.getByDataTestid('menuTeam').should('be.visible').click()
        cy.url().should('contain', `/projects/${project.id}/team`)
        cy.getByDataTestid('teamTable').get('th').contains('Retirer du projet').should('be.visible')
        cy.getByDataTestid('addUserSuggestionInput').should('be.visible')
        cy.getByDataTestid('showTransferProjectBtn').should('not.exist')

        cy.getByDataTestid('menuDashboard').should('be.visible').click()
        cy.url().should('contain', `/projects/${project.id}/dashboard`)
        cy.getByDataTestid('replayHooksBtn').should('be.enabled')
        cy.getByDataTestid('showSecretsBtn').should('be.enabled')

        cy.getByDataTestid('menuProjectRole').should('be.visible').click()
        projectRoles.forEach((role) => {
          cy.getByDataTestid(`${role.id}-tab`).should('be.visible')
        })
      })
    })
  })
})
