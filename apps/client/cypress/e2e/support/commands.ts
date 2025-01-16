import { deleteValidationInput } from '@cpn-console/shared'
import { getModelById } from './func.js'
import { keycloakDomain } from '@/utils/env.js'

const defaultOwner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')

Cypress.Commands.add('kcLogout', () => {
  cy.get('a.fr-btn').should('contain', 'Se déconnecter').click()
})

Cypress.Commands.add('kcLogin', (name, password = 'test') => {
  cy.session(name, () => {
    cy.visit('/')
      .get('a.fr-btn').should('contain', 'Se connecter').click()
    cy.origin(`http://${keycloakDomain}`, { args: { name, password } }, ({ name, password }) => {
      cy.get('input#username').type(name)
        .get('input#password').type(password)
        .get('input#kc-login').click()
    })
    cy.url().should('contain', `${Cypress.env('clientHost')}`)
  }, {
    validate() {
      cy.visit('/')
        .get('a.fr-btn').should('contain', 'Se déconnecter')
    },
  })
})

Cypress.Commands.add('goToProjects', () => {
  cy.intercept('GET', 'api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

  cy.get('body').then(($body) => {
    // Vérifie si un élément est présent
    if ($body.find('a').length === 0) {
      // Si l'élément n'est pas trouvé, on considère qu'on est dans les limbes
      cy.visit('/')
    }
  })
  cy.getByDataTestid('menuMyProjects').click()
  cy.url({ timeout: 10_000 }).should('contain', '/projects')
})

Cypress.Commands.add('createProject', (project, ownerEmail = defaultOwner.email) => {
  cy.intercept('POST', '/api/v1/projects').as('postProject')
  cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

  const newProject = {
    name: 'cloud-pi-native',
    ...project,
  }

  cy.goToProjects()
    .getByDataTestid('createProjectLink').click()
    .get('h1').should('contain', 'Commander un espace projet')
    .get('[data-testid^="repoFieldset-"]').should('not.exist')
  cy.getByDataTestid('ownerInfo').should('contain', ownerEmail)
    .getByDataTestid('nameInput').clear().type(newProject.name)
    .getByDataTestid('nameInput').should('not.have.class', 'fr-input--error')
  cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

  cy.wait('@postProject').its('response.statusCode').should('eq', 201)
  cy.wait('@listProjects').its('response.statusCode').should('eq', 200)
})

Cypress.Commands.add('assertCreateProjects', (slugs) => {
  cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
  cy.goToProjects()
    .url().should('match', /\/projects$/)
    .wait('@listProjects').its('response.statusCode').should('eq', 200)
  slugs.forEach(slug => cy.getByDataTestid(`projectTile-${slug}`).should('exist'))
})

Cypress.Commands.add('archiveProject', (project) => {
  cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
  cy.intercept('GET', '/api/v1/stages').as('getAllStages')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()

  cy.url().should('contain', project.slug)
  cy.wait('@getAllStages')
    .getByDataTestid('archiveProjectInput').should('not.exist')
    .getByDataTestid('showArchiveProjectBtn')
    .should('be.visible')
    .click()
  cy.getByDataTestid('confirmDeletionBtn')
    .should('be.disabled')
  cy.getByDataTestid('archiveProjectInput').should('be.visible')
    .type(deleteValidationInput)
  cy.getByDataTestid('confirmDeletionBtn')
    .should('be.enabled')
    .click()

  cy.url().should('match', /\/projects$/)
  cy.wait('@listProjects').its('response.statusCode').should('eq', 200)
  cy.getByDataTestid(`projectTile-${project.slug}`)
    .should('not.exist')
})

Cypress.Commands.add('addRepos', (project, repos) => {
  cy.intercept('POST', '/api/v1/repositories').as('postRepo')
  cy.intercept('GET', `/api/v1/repositories?projectId=${project.id}`).as('listRepos')

  const newRepo = repo => ({
    internalRepoName: 'console',
    externalUserName: 'this-is+tobi',
    externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
    isInfra: false,
    isPrivate: false,
    externalToken: 'private-token',
    ...repo,
  })

  const newRepos = repos.map(newRepo)

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()

  newRepos.forEach((repo) => {
    cy.getByDataTestid('addRepoLink').click()
      .get('h2').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('internalRepoNameInput').type(repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)

    if (repo.isPrivate) {
      cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
      if (repo.externalUserName) {
        cy.getByDataTestid('externalUserNameInput').type(repo.externalUserName)
      }
      if (repo.externalToken) {
        cy.getByDataTestid('externalTokenInput').clear().type(repo.externalToken)
      }
    }

    if (repo.isInfra) {
      cy.getByDataTestid('input-checkbox-infraRepoCbx').check({ force: true })
    }

    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('eq', 201)
    cy.wait('@listRepos').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`repoTr-${repo.internalRepoName}`).should('exist')
  })
})

Cypress.Commands.add('assertAddRepo', (project, repos) => {
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()
    .getByDataTestid('test-tab-resources').click()

  repos.forEach((repo) => {
    cy.getByDataTestid(`repoTr-${repo.internalRepoName}`).should('exist')
  })
})

Cypress.Commands.add('deleteRepo', (project, repo) => {
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()

  cy.getByDataTestid(`repoTr-${repo.internalRepoName}`).click()
    .getByDataTestid('repo-form').should('exist')
    .getByDataTestid('deleteRepoInput').should('not.exist')
    .getByDataTestid('deleteRepoZone')
    .scrollIntoView()
    .should('be.visible')
    .getByDataTestid('showDeleteRepoBtn').click()
    .getByDataTestid('deleteRepoBtn')
    .should('be.disabled')
    .getByDataTestid('deleteRepoInput').should('be.visible')
    .type(deleteValidationInput)
    .getByDataTestid('deleteRepoBtn')
    .should('be.enabled')
    .click()
    .getByDataTestid('repo-form').should('not.exist')
    .reload()
    .getByDataTestid(`repoTr-${repo.internalRepoName}`)
    .should('not.exist')
})

Cypress.Commands.add('addEnvironment', (project, environments) => {
  cy.intercept('GET', 'api/v1/stages').as('listStages')
  cy.intercept('GET', `api/v1/environments?projectId=${project.id}`).as('listEnvironments')
  cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('POST', '/api/v1/environments').as('postEnvironment')
  cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project?.slug}`)
    .click()
  cy.getByDataTestid('test-tab-resources')
    .click()
  cy.wait('@getClusters')

  environments.forEach((environment) => {
    cy.getByDataTestid('addEnvironmentLink').click()
    cy.wait('@listStages')
    cy.wait('@listQuotas')
    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentNameInput')
      .type(environment?.name)
    cy.get('#zone-select')
      .select('a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
    cy.get('#stage-select')
      .select(environment?.stage?.id)
    cy.get('#quota-select')
      .select(environment?.quota?.id)
    cy.get('#cluster-select')
      .select(environment?.cluster?.id)

    cy.getByDataTestid('addEnvironmentBtn').click()
    cy.wait('@postEnvironment').its('response.statusCode').should('eq', 201)
    cy.wait('@listEnvironments').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`environmentTr-${environment?.name}`).should('exist')
  })
})

Cypress.Commands.add('assertAddEnvironment', (project, environments, isDeepCheck = true) => {
  cy.intercept('GET', '/api/v1/environments?projectId=*').as('listEnvironments')
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('GET', 'api/v1/stages').as('listStages')
  cy.intercept('GET', 'api/v1/quotas').as('listQuotas')
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`)
    .click()
  cy.getByDataTestid('test-tab-resources')
    .click()
  cy.wait('@listEnvironments')
  cy.wait('@getClusters')

  environments.forEach((environment) => {
    cy.getByDataTestid(`environmentTr-${environment.name}`)
      .should('exist')
    if (isDeepCheck) {
      cy.getByDataTestid(`environmentTr-${environment.name}`)
        .click()
      cy.wait('@listStages')
      cy.wait('@listQuotas')
      cy.getByDataTestid('environmentNameInput')
        .should('have.value', environment?.name)
      cy.get('#zone-select')
        .should('have.value', 'a66c4230-eba6-41f1-aae5-bb1e4f90cce2')
      cy.get('#stage-select')
        .should('have.value', environment?.stage?.id)
      cy.get('#quota-select')
        .should('have.value', environment?.quota?.id)
      cy.get('#cluster-select')
        .should('have.value', environment?.cluster?.id)
      const comeBackMethod = Math.random()
      if (comeBackMethod < 0.33) {
        cy.get('#fr-modal-1')
          .click('right')
      } else if (comeBackMethod < 0.66) {
        cy.get('div.fr-modal__header > button.fr-btn--close')
          .click()
      } else {
        cy.getByDataTestid('cancelEnvironmentBtn')
          .click()
      }
      cy.getByDataTestid('resource-modal')
        .should('not.exist')
    }
  })
})

Cypress.Commands.add('deleteEnvironment', (project, environmentName) => {
  cy.intercept('GET', '/api/v1/environments?projectId=*').as('listEnvironments')
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('DELETE', '/api/v1/environments/*').as('deleteEnvironment')
  cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

  cy.goToProjects()
  cy.getByDataTestid(`projectTile-${project.slug}`).click()
  cy.wait('@listEnvironments')
  cy.wait('@getClusters')
  cy.getByDataTestid(`environmentTr-${environmentName}`)
    .click()
  cy.getByDataTestid('showDeleteEnvironmentBtn').click()
  cy.getByDataTestid('deleteEnvironmentInput').should('be.visible')
  cy.getByDataTestid('deleteEnvironmentInput')
    .type(environmentName.slice(0, 2))
  cy.getByDataTestid('deleteEnvironmentBtn').should('be.disabled')
  cy.getByDataTestid('deleteEnvironmentInput').clear()
    .type(deleteValidationInput)
  cy.getByDataTestid('deleteEnvironmentBtn').should('be.enabled')
    .click()
  cy.wait('@deleteEnvironment').its('response.statusCode').should('eq', 204)
  cy.wait('@listProjects').its('response.statusCode').should('eq', 200)
  cy.getByDataTestid(`environmentTr-${environmentName}`).should('not.exist')
})

Cypress.Commands.add('addProjectMember', (project, userEmail) => {
  cy.intercept('POST', /\/api\/v1\/projects\/[\w-]{36}\/users$/).as('postUser')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()
    .getByDataTestid('menuTeam').click()
    .url().should('match', /\/team$/)
    .getByDataTestid('teamTable')
    .find('tbody > tr')
    .should('have.length', project.users.length)
    .getByDataTestid('addUserSuggestionInput')
    .find('input')
    .clear()
    .type(userEmail)
    .getByDataTestid('userErrorInfo')
    .should('not.exist')
    .getByDataTestid('addUserBtn')
    .should('be.enabled').click()
    .wait('@postUser')
    .its('response.statusCode').should('eq', 201)
    .getByDataTestid('teamTable')
    .find('tbody > tr')
    .should('have.length', project.users.length + 1)
})

Cypress.Commands.add('assertUsers', (project, emails) => {
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.slug}`).click()
    .getByDataTestid('test-tab-team').click()

  emails.forEach((email) => {
    cy.getByDataTestid('teamTable').within(() => {
      cy.get('td')
        .contains(email)
        .should('exist')
    })
  })
})

Cypress.Commands.add('generateGitLabCI', (ciForms) => {
  let version
  ciForms.forEach((ciForm) => {
    if (ciForm.language === 'java') version = `BUILD_IMAGE_NAME: maven:3.8-openjdk-${ciForm.version}`
    if (ciForm.language === 'node') version = `BUILD_IMAGE_NAME: node:${ciForm.version}`
    if (ciForm.language === 'python') version = `BUILD_IMAGE_NAME: maven:3.8-openjdk-${ciForm.version}`

    cy.get('select#type-language-select')
      .select(`${ciForm.language}`)

    if (ciForm.language === 'node') {
      cy.getByDataTestid('nodeVersionInput').clear().type(`${ciForm.version}`)
        .getByDataTestid('nodeInstallInput').clear().type(`${ciForm.install}`)
        .getByDataTestid('nodeBuildInput').clear().type(`${ciForm.build}`)
    }
    if (ciForm.language === 'java') {
      cy.getByDataTestid('javaVersionInput').clear().type(`${ciForm.version}`)
        .getByDataTestid('artefactDirInput').clear().type(`${ciForm.artefactDir}`)
    }
    cy.getByDataTestid('workingDirInput').clear().type(`${ciForm.workingDir}`)
      .getByDataTestid('generateCIBtn').click()
      .getByDataTestid('generatedCI').should('be.visible')
      .getByDataTestid('zip-download-link').should('contain', 'Télécharger tous les fichiers')
      .getByDataTestid(`copy-${ciForm.language}-ContentBtn`).should('exist')
      .getByDataTestid('copy-vault-ContentBtn').should('exist')
      .getByDataTestid('copy-docker-ContentBtn').should('exist')
      .getByDataTestid('copy-rules-ContentBtn').should('exist')
      .getByDataTestid('copy-gitlab-ci-dso-ContentBtn').click()
    cy.assertClipboard(version)
    cy.get('.fr-link--download').first().click()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/zip – \d* bytes/)
      })
    cy.get('.fr-link--download').last().click()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/YAML – \d* bytes/)
      })
  })
})

Cypress.Commands.add('assertClipboard', (value) => {
  cy.window().then((win) => {
    win.navigator.clipboard.readText().then((text) => {
      expect(text).to.contain(value)
    })
  })
})

Cypress.Commands.add('getServicesResponse', () => {
  cy.wait('@getServices').its('response').then((response) => {
    const services = response.body
    services.map(service =>
      cy.getByDataTestid(`${service.name}-info`).should('contain', `${service.code} - ${service.message}`),
    )
    if (services.find(service => service.code >= 400)) {
      cy.getByDataTestid('services-health-badge').should('contain', 'Un ou plusieurs services dysfonctionnent')
    } else {
      cy.getByDataTestid('services-health-badge').should('contain', 'Tous les services fonctionnent')
    }
  })
})

Cypress.Commands.add('getByDataTestid', (dataTestid, timeout = 4_000) => {
  cy.get(`[data-testid="${dataTestid}"]`, { timeout })
})

Cypress.Commands.add('selectProject', (element) => {
  cy.getByDataTestid('projectSelector')
    ?.find('select')
    ?.select(element)
})

Cypress.Commands.add('deleteIndexedDB', () => {
  Cypress.on('window:before:load', (win) => {
    win.indexedDB.deleteDatabase('localforage')
  })
})

Cypress.on('uncaught:exception', (_err, _runnable) => false)

// Commande pour accéder / interagir avec le store dans les tests
Cypress.Commands.add('getStore', () => cy.window().its('app.$store'))

// A utiliser sur les éléments détâchés du DOM (lors de rerendu assez lourds dans le DOM)
// https://github.com/cypress-io/cypress/issues/7306#issuecomment-850621378
// Recursively gets an element, returning only after it's determined to be attached to the DOM for good
Cypress.Commands.add('getSettled', (selector, opts = {}) => {
  const retries = opts.retries || 3
  const delay = opts.delay || 100

  const isAttached = (resolve, count = 0) => {
    const el = Cypress.$(selector)

    // Is element attached to the DOM?
    count = Cypress.dom.isAttached(el) ? count + 1 : 0

    // Hit our base case, return the element
    if (count >= retries) {
      return resolve(el)
    }

    // Retry after a bit of a delay
    setTimeout(() => isAttached(resolve, count), delay)
  }

  // Wrap, so we can chain cypress commands off the result
  return cy.wrap(null).then(() => {
    return new Cypress.Promise((resolve) => {
      return isAttached(resolve, 0)
    }).then((el) => {
      return cy.wrap(el)
    })
  })
})

Cypress.Commands.add('goToAdminListUsers', () => {
  cy.get('body').then(($body) => {
    if ($body.find('a').length === 0) {
      // Si l'élément n'est pas trouvé, on considère qu'on est dans les limbes
      cy.visit('/admin/users')
    }
  })
  try {
    cy.getByDataTestid('menuAdministrationUsers', 100).click()
    cy.url().should('contain', '/admin/users')
  } catch (_) {
    cy.getByDataTestid('menuAdministrationBtn').click()
      .getByDataTestid('menuAdministrationUsers').click()
    cy.url().should('contain', '/admin/users')
  }
})

Cypress.Commands.add('checkTableBody', (tableDataTestId: string, rowLength: number, noResultText?: string) => {
  if (rowLength) {
    cy.getByDataTestid(tableDataTestId)
      .get('tbody > tr')
      .should('not.have.text', noResultText)
      .should('have.length', rowLength)
  } else {
    cy.get('tr:last-child>td:first-child')
      .should('have.text', noResultText)
  }
})
