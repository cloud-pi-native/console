// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

import type { Project, Repository, CiForm } from '../../types.js'
import './commands.js'

Cypress.on('window:before:load', (win) => {
  let copyText
  if (!win.navigator.clipboard) {
    // @ts-ignore
    win.navigator.clipboard = {}
  }
  Object.setPrototypeOf(win.navigator.clipboard, {
    writeText: async (text) => (copyText = text),
    readText: async () => copyText,
  })
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to logout from application
       * @example cy.kcLogout()
       */
      kcLogout(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to login to application with a given user
       * @param name
       * @param password
       * @example cy.kcLogin('test', 'test')
       */
      kcLogin(
        name: string,
        password?: string,
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to visit the projects page
       * @example cy.goToProjects()
       */
      goToProjects(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to create a new project
       * @param project
       * @example cy.createProject({ name: 'projectName', orgName: 'orgName' })
       */
      createProject(
        project: Project
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert projects creation
       * @param names
       * @example cy.assertCreateProjects(['project1', 'project2'])
       */
      assertCreateProjects(
        names: string[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to archive a project
       * @param project
       * @example cy.archiveProject({ name: 'projectName' })
       */
      archiveProject(
        project: Project
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to add repositories into a project
       * @param project
       * @param repos
       * @example cy.addRepos({ name: 'projectName' }, [{ internalRepoName: 'repo1' }, { internalRepoName: 'repo2' }])
       */
      addRepos(
        project: Project,
        repos: Repository[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert repos creation
       * @param project
       * @param repos
       * @example cy.assertAddRepo({ name: 'projectName' }, [{ internalRepoName: 'repo1' }, { internalRepoName: 'repo2' }])
       */
      assertAddRepo(
        project: Project,
        repos: Repository[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to delete a repo
       * @param project
       * @param repo
       * @example cy.deleteRepo({ name: 'projectName' }, { internalRepoName: 'repo1' })
       */
      deleteRepo(
        project: Project,
        repo: Repository
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to create environements
       * @param project
       * @param environements
       * @example cy.addEnvironment({ name: 'projectName' }, ['preprod', 'prod'])
       */
      addEnvironment(
        project: Project,
        environments: any[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert environements creation
       * @param project
       * @param environements
       * @example cy.assertAddEnvironment({ name: 'projectName' }, ['preprod', 'prod'])
       */
      assertAddEnvironment(
        project: Project,
        environments: any[],
        isDeepCheck?: boolean,
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to delete an environment
       * @param project
       * @param environement
       * @example cy.deleteEnvironment({ name: 'projectName' }, 'prod')
       */
      deleteEnvironment(
        project: Project,
        environments: string
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to add a permission
       * @param project
       * @param environement
       * @param userToLicence
       * @example cy.addPermission({ name: 'projectName' }, 'prod', 'test@test.com')
       */
      addPermission(
        project: Project,
        environment: string,
        user: string
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert permission creations
       * @param project
       * @param environement
       * @param permissions
       * @example cy.assertPermission({ name: 'projectName' }, 'prod', [{ email: 'test1@test.com', isOwner: true }, { email: 'test2@test.com', isOwner: false }])
       */
      assertPermission(
        project: Project,
        environment: string,
        permissions: {
          email: string,
          isOwner: boolean
        }[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to add a member to a project
       * @param project
       * @param userEmail
       * @example cy.addProjectMember({ name: 'projectName' }, 'test@test.com')
       */
      addProjectMember(
        project: Project & {
          users: Record<string, unknown>[]
        },
        userEmail: string,
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert members creation into a project
       * @param project
       * @param emails
       * @example cy.assertUsers({ name: 'projectName' }, ['test1@test.com', 'test2@test.com'])
       */
      assertUsers(
        project: Project,
        emails: string[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert members creation into a project
       * @param ciForms
       * @example cy.generateGitLabCI([{ language: 'node', version: '20.0.0', install: 'npm install', build: 'npm run build',workingDir: './' }])
       */
      generateGitLabCI(
        ciForms: CiForm[]
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert clipboard value
       * @param value
       * @example cy.assertClipboard('test')
       */
      assertClipboard(
        value: string
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to assert services health
       * @example cy.getServicesResponse()
       */
      getServicesResponse(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to get an html element by its 'data-testid'
       * @param dataTestid
       * @param timeout
       * @example cy.getByDataTestid('testBtn')
       */
      getByDataTestid(
        dataTestid: string,
        timeout?: number
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to select a project from the selector
       * @param element
       * @example cy.selectProject('project1')
       */
      selectProject(
        element: string
      ): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to delete window indexedDB 'localForage'
       * @example cy.deleteIndexedDB()
       */
      deleteIndexedDB(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to access pinia store
       * @example cy.getStore()
       */
      getStore(): Chainable<JQuery<HTMLElement>>

      /**
       * Custom command to get an html element by its 'data-testid' with a retry system for flaky tests
       * @param selector
       * @param opt
       * @example cy.getSettled('testBtn')
       */
      getSettled(
        selector: string,
        opt?: {
          delay?: number,
          retries?: number
        }
      ): void

      /**
       * Custom command to visit admin user list page
       * @example cy.goToAdminListUsers()
       */
      goToAdminListUsers(): Chainable<JQuery<HTMLElement>>
    }
  }
}
