import { nanoid } from 'nanoid'
import { allServices, envList } from 'shared/src/schemas/project.js'

Cypress.Commands.add('kcLogout', () => {
  cy.get('a.fr-btn').should('contain', 'Se déconnecter').click()
})

Cypress.Commands.add('kcLogin', (name) => {
  cy.session(name, () => {
    cy.visit('/')
      .get('a.fr-btn').should('contain', 'Se connecter').click()
      .get('input#username').type(name)
      .get('input#password').type(name)
      .get('input#kc-login').click()
      .url().should('contain', `${Cypress.env('clientHost')}:${Cypress.env('clientPort')}`)
  }, {
    validate () {
      cy.visit('/')
        .get('a.fr-btn').should('contain', 'Se déconnecter')
    },
  })
})

Cypress.Commands.add('goToProjects', () => {
  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
    .getByDataTestid('menuMyProjects').click()
    .url().should('contain', '/projects')
})

Cypress.Commands.add('createProject', (project) => {
  cy.intercept('POST', '/api/v1/projects').as('postProject')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  const newProject = {
    id: nanoid(),
    repos: [],
    owner: {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      email: 'test@test.com',
      firstName: 'test',
      lastName: 'TEST',
    },
    orgName: 'ministere-interieur',
    services: allServices,
    envList,
    projectName: 'CloudPiNative',
    ...project,
  }

  cy.goToProjects()
    .getByDataTestid('createProjectLink').click()
    .get('h1').should('contain', 'Commander un espace projet')
    .get('[data-testid^="repoFieldset-"]').should('not.exist')
    .get('p.fr-alert__description').should('contain', newProject.owner.email)
    .getByDataTestid('orgNameSelect').find('select').select('ministere-interieur')
    .getByDataTestid('projectNameInput').type(`${newProject.projectName} ErrorSpace`)
    .getByDataTestid('projectNameInput').should('have.class', 'fr-input--error')
    .getByDataTestid('projectNameInput').clear().type(newProject.projectName)
    .getByDataTestid('projectNameInput').should('not.have.class', 'fr-input--error')
    .getByDataTestid('envListSelect')
    .find('[data-testid^="input-checkbox-"]').should('have.length', envList.length)
  if (newProject.envList.length !== envList.length) {
    envList.forEach(env => {
      if (!newProject.envList.includes(env)) {
        cy.getByDataTestid(`input-checkbox-${env}`).uncheck({ force: true })
      }
    })
  }
  cy.getByDataTestid('createProjectBtn').should('be.enabled').click()

  cy.wait('@postProject').its('response.statusCode').should('eq', 201)
  cy.wait('@getProjects').its('response.statusCode').should('eq', 200)

  if (newProject.repos.length) {
    cy.addRepos(newProject.repos)
  }
})

Cypress.Commands.add('assertCreateProject', (projectName) => {
  cy.getByDataTestid('menuMyProjects').click()
    .url().should('contain', '/projects')
    .getByDataTestid(`projectTile-${projectName}`).should('exist')
})

Cypress.Commands.add('addRepos', (project, repos) => {
  cy.intercept('POST', '/api/v1/projects/*/repos').as('postRepo')
  cy.intercept('GET', '/api/v1/projects').as('getProjects')

  const newRepo = (repo) => ({
    internalRepoName: 'dso-console',
    externalUserName: 'this-is-tobi',
    externalRepoUrl: 'https://github.com/dnum-mi/dso-console.git',
    isInfra: false,
    isPrivate: false,
    externalToken: 'private-token',
    ...repo,
  })

  const newRepos = repos.map(newRepo)

  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
    .getByDataTestid('menuMyProjects').click()
    .url().should('contain', '/projects')
    .getByDataTestid(`projectTile-${project.projectName}`).click()
    .getByDataTestid('menuRepos').click()
    .url().should('contain', '/repos')

  newRepos.forEach((repo) => {
    cy.getByDataTestid('addRepoLink').click()
      .get('h1').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('internalRepoNameInput').type(repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)

    if (repo.isPrivate) {
      cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').check({ force: true })
        .getByDataTestid('externalUserNameInput').type(repo.externalUserName)
        .getByDataTestid('externalTokenInput').clear().type(repo.externalToken)
    }

    if (repo.isInfra) {
      cy.getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').check({ force: true })
    }

    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('eq', 201)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
  })
})

Cypress.Commands.add('assertAddRepo', (project, repos) => {
  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
    .getByDataTestid('menuMyProjects').click()
    .url().should('contain', '/projects')
    .getByDataTestid(`projectTile-${project.projectName}`).click()
    .getByDataTestid('menuRepos').click()

  repos.forEach((repo) => {
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
  })
})

Cypress.Commands.add('generateGitLabCI', (ciForms) => {
  let version
  ciForms.forEach(ciForm => {
    if (ciForm.language === 'java') version = `BUILD_IMAGE_NAME: maven:3.8-openjdk-${ciForm.version}`
    if (ciForm.language === 'node') version = `BUILD_IMAGE_NAME: node:${ciForm.version}`
    if (ciForm.language === 'python') version = `BUILD_IMAGE_NAME: maven:3.8-openjdk-${ciForm.version}`

    cy.getByDataTestid('typeLanguageSelect')
      .find('select').select(`${ciForm.language}`)

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
      .getByDataTestid(`copy-${ciForm.language}-ContentBtn`).should('exist')
      .getByDataTestid('copy-vault-ContentBtn').should('exist')
      .getByDataTestid('copy-docker-ContentBtn').should('exist')
      .getByDataTestid('copy-rules-ContentBtn').should('exist')
      .getByDataTestid('copy-gitlab-ContentBtn').click()
      .window().its('navigator.clipboard')
      .invoke('readText').should('equal', version)
    cy.get('.fr-download__link').first().click()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/YAML – \d* bytes/)
      })
  })
})

Cypress.Commands.add('getByDataTestid', (dataTestid) => {
  cy.get(`[data-testid="${dataTestid}"]`)
})

Cypress.Commands.add('selectProject', (element) => {
  cy.getByDataTestid('projectSelector').find('select').select(element)
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
