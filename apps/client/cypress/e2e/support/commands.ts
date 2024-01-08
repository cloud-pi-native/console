import { getModelById } from './func'

const defaultOwner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')

Cypress.Commands.add('kcLogout', () => {
  cy.get('a.fr-btn').should('contain', 'Se déconnecter').click()
})

Cypress.Commands.add('kcLogin', (name, password = 'test') => {
  cy.session(name, () => {
    cy.visit('/')
      .get('a.fr-btn').should('contain', 'Se connecter').click()
      .get('input#username').type(name)
      .get('input#password').type(password)
      .get('input#kc-login').click()
      .url().should('contain', `${Cypress.env('clientHost')}`)
  }, {
    validate () {
      cy.visit('/')
        .get('a.fr-btn').should('contain', 'Se déconnecter')
    },
  })
})

Cypress.Commands.add('goToProjects', () => {
  cy.intercept('GET', 'api/v1/projects').as('getProjects')

  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
  cy.getByDataTestid('menuMyProjects').click()
  cy.wait('@getProjects')
  cy.url().should('contain', '/projects')
})

Cypress.Commands.add('createProject', (project, ownerEmail = defaultOwner.email) => {
  cy.intercept('POST', '/api/v1/projects').as('postProject')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  const newProject = {
    orgName: 'mi',
    name: 'cloud-pi-native',
    ...project,
  }

  cy.goToProjects()
    .getByDataTestid('createProjectLink').click()
    .get('h1').should('contain', 'Commander un espace projet')
    .get('[data-testid^="repoFieldset-"]').should('not.exist')
    .get('p.fr-alert__description').should('contain', ownerEmail)
    .get('select#organizationId-select').select(newProject.orgName)
    .getByDataTestid('nameInput').find('input').clear().type(newProject.name)
    .getByDataTestid('nameInput').should('not.have.class', 'fr-input--error')
  cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

  cy.wait('@postProject').its('response.statusCode').should('eq', 201)
  cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
})

Cypress.Commands.add('assertCreateProjects', (names) => {
  cy.intercept('GET', '/api/v1/projects').as('getProjects')
  cy.goToProjects()
    .url().should('match', /\/projects$/)
    .wait('@getProjects').its('response.statusCode').should('eq', 200)
  names.forEach(name => cy.getByDataTestid(`projectTile-${name}`).should('exist'))
})

Cypress.Commands.add('archiveProject', (project) => {
  cy.intercept('GET', '/api/v1/projects').as('getProjects')
  cy.intercept('GET', '/api/v1/stages').as('getAllStages')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuDashboard').click()

  cy.url().should('contain', 'dashboard')
  cy.wait('@getAllStages')
    .getByDataTestid('archiveProjectInput').should('not.exist')
    .getByDataTestid('archiveProjectZone').should('be.visible')
    .getByDataTestid('showArchiveProjectBtn').click()
    .getByDataTestid('archiveProjectBtn')
    .should('be.disabled')
    .getByDataTestid('archiveProjectInput').should('be.visible')
    .type(project.name)
    .getByDataTestid('archiveProjectBtn')
    .should('be.enabled')
    .click()

  cy.url().should('match', /\/projects$/)
  cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
  cy.getByDataTestid(`projectTile-${project.name}`)
    .should('not.exist')
  cy.getByDataTestid('archiveProjectZone')
    .should('not.exist')
})

Cypress.Commands.add('addRepos', (project, repos) => {
  cy.intercept('POST', '/api/v1/projects/*/repositories').as('postRepo')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  const newRepo = (repo) => ({
    internalRepoName: 'console',
    externalUserName: 'this-is-tobi',
    externalRepoUrl: 'https://github.com/cloud-pi-native/console.git',
    isInfra: false,
    isPrivate: false,
    externalToken: 'private-token',
    ...repo,
  })

  const newRepos = repos.map(newRepo)

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuRepos').click()
    .url().should('contain', '/repositories')

  newRepos.forEach((repo) => {
    cy.getByDataTestid('addRepoLink').click()
      .get('h1').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('internalRepoNameInput').find('input').type(repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl)

    if (repo.isPrivate) {
      cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').check({ force: true })
        .getByDataTestid('externalUserNameInput').find('input').type(repo.externalUserName)
        .getByDataTestid('externalTokenInput').find('input').clear().type(repo.externalToken)
    }

    if (repo.isInfra) {
      cy.getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').check({ force: true })
    }

    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('eq', 201)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
    cy.wait(1000).reload()
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
  })
})

Cypress.Commands.add('assertAddRepo', (project, repos) => {
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuRepos').click()

  repos.forEach((repo) => {
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
  })
})

Cypress.Commands.add('deleteRepo', (project, repo) => {
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuRepos').click()

  cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).click()
    .getByDataTestid('repo-form').should('exist')
    .getByDataTestid('deleteRepoInput').should('not.exist')
    .getByDataTestid('deleteRepoZone').should('be.visible')
    .getByDataTestid('showDeleteRepoBtn').click()
    .getByDataTestid('deleteRepoBtn')
    .should('be.disabled')
    .getByDataTestid('deleteRepoInput').should('be.visible')
    .type(repo.internalRepoName)
    .getByDataTestid('deleteRepoBtn')
    .should('be.enabled')
    .click()
    .getByDataTestid('repo-form').should('not.exist')
    .reload()
    .getByDataTestid(`repoTile-${repo.internalRepoName}`)
    .should('not.exist')
})

Cypress.Commands.add('addEnvironment', (project, environments) => {
  cy.intercept('GET', 'api/v1/stages').as('getStages')
  cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('POST', '/api/v1/projects/*/environments').as('postEnvironment')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  environments.forEach((environment) => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project?.name}`)
      .click()
    cy.getByDataTestid('menuEnvironments')
      .click()
    cy.url().should('contain', '/environments')
    cy.wait('@getClusters')

    cy.getByDataTestid('addEnvironmentLink').click()
    cy.wait('@getStages')
    cy.wait('@getQuotas')
    cy.get('h1').should('contain', 'Ajouter un environnement au projet')
    cy.getByDataTestid('environmentNameInput')
      .type(environment?.name)
    cy.get('#stage-select')
      .select(environment?.stage?.id)
    cy.get('#quota-select')
      .select(environment?.quota?.id)
    cy.get('#cluster-select')
      .select(environment?.cluster?.id)

    cy.getByDataTestid('addEnvironmentBtn').click()
    cy.wait('@postEnvironment').its('response.statusCode').should('eq', 201)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`environmentTile-${environment?.name}`).should('exist')
  })
})

Cypress.Commands.add('assertAddEnvironment', (project, environments, isDeepCheck = true) => {
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('GET', 'api/v1/stages').as('getStages')
  cy.intercept('GET', 'api/v1/quotas').as('getQuotas')
  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`)
    .click()
  cy.getByDataTestid('menuEnvironments')
    .click()
  cy.wait('@getClusters')

  environments.forEach((environment) => {
    cy.getByDataTestid(`environmentTile-${environment.name}`)
      .should('exist')
    if (isDeepCheck) {
      cy.getByDataTestid(`environmentTile-${environment.name}`)
        .click()
      cy.wait('@getStages')
      cy.wait('@getQuotas')
      cy.getByDataTestid('environmentNameInput')
        .should('have.value', environment?.name)
      cy.get('#stage-select')
        .should('have.value', environment?.stage?.id)
      cy.get('#quota-select')
        .should('have.value', environment?.quota?.id)
      cy.get('#cluster-select')
        .should('have.value', environment?.cluster?.id)
    }
  })
})

Cypress.Commands.add('deleteEnvironment', (project, environmentName) => {
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('DELETE', '/api/v1/projects/*/environments/*').as('deleteEnvironment')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuEnvironments').click()
  cy.wait('@getClusters')
  cy.getByDataTestid(`environmentTile-${environmentName}`)
    .click()
    .url().should('contain', '/environments')
    .getByDataTestid('permissionsFieldset').should('be.visible')
  cy.getByDataTestid('showDeleteEnvironmentBtn').click()
    .getByDataTestid('deleteEnvironmentInput').should('be.visible')
    .getByDataTestid('permissionsFieldset').should('not.exist')
    .getByDataTestid('deleteEnvironmentInput')
    .type(environmentName.slice(0, 2))
    .getByDataTestid('deleteEnvironmentBtn').should('be.disabled')
    .getByDataTestid('deleteEnvironmentInput').clear()
    .type(environmentName)
    .getByDataTestid('deleteEnvironmentBtn').should('be.enabled')
    .click()
  cy.wait('@deleteEnvironment').its('response.statusCode').should('eq', 204)
  cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
  cy.getByDataTestid(`environmentTile-${environmentName}`).should('not.exist')
})

Cypress.Commands.add('addPermission', (project, environmentName, userToLicence) => {
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')
  cy.intercept('POST', `/api/v1/projects/${project.id}/environments/*/permissions`).as('postPermission')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuEnvironments').click()
  cy.wait('@getClusters')
  cy.getByDataTestid(`environmentTile-${environmentName}`)
    .click()

  cy.getByDataTestid('permissionSuggestionInput')
    .find('input')
    .clear()
    .type(userToLicence)

  cy.wait('@postPermission')
    .its('response.statusCode').should('eq', 201)
})

Cypress.Commands.add('assertPermission', (project, environmentName, permissions) => {
  cy.intercept('GET', 'api/v1/clusters').as('getClusters')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuEnvironments').click()
  cy.wait('@getClusters')
  cy.getByDataTestid(`environmentTile-${environmentName}`)
    .click()

  permissions.forEach(permission => {
    cy.getByDataTestid(`userPermissionLi-${permission.email}`).within(() => {
      cy.getByDataTestid('userEmail')
        .should('contain', permission.email)
        .getByDataTestid('deletePermissionBtn')
        .should(permission.isOwner ? 'be.disabled' : 'be.enabled')
        .and('have.attr', 'title', permission.isOwner ? 'Les droits du owner ne peuvent être supprimés' : `Supprimer les droits de ${permission.email}`)
        .getByDataTestid('permissionLevelRange')
        .should(permission.isOwner ? 'be.disabled' : 'be.enabled')
    })
  })
})

Cypress.Commands.add('addProjectMember', (project, userEmail) => {
  cy.intercept('POST', /\/api\/v1\/projects\/[\w-]{36}\/users$/).as('postUser')

  cy.goToProjects()
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuTeam').click()
    .url().should('match', /\/team$/)
    .getByDataTestid('teamTable')
    .find('tbody > tr')
    .should('have.length', project.users.length)
    .getByDataTestid('addUserSuggestionInput').find('input').clear()
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
    .getByDataTestid(`projectTile-${project.name}`).click()
    .getByDataTestid('menuTeam').click()

  emails.forEach(email => {
    cy.getByDataTestid('teamTable').within(() => {
      cy.get('td')
        .contains(email)
        .should('exist')
    })
  })
})

Cypress.Commands.add('generateGitLabCI', (ciForms) => {
  let version
  ciForms.forEach(ciForm => {
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
  cy.wait('@getServices').its('response').then(response => {
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
  Cypress.on('window:before:load', win => {
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
  cy.visit('/')
    .getByDataTestid('menuAdministrationBtn').click()
    .getByDataTestid('menuAdministrationUsers').click()
    .url().should('contain', '/admin/users')
})
