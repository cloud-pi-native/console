import { nanoid } from 'nanoid'

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

Cypress.Commands.add('orderProject', (project) => {
  cy.intercept('POST', '/api/v1/projects').as('postProject')

  const newProject = {
    id: nanoid(),
    repo: [],
    owner: {
      id: 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565',
      email: 'test@test.com',
      firstName: 'test',
      lastName: 'TEST',
    },
    orgName: 'ministere-interieur',
    services: [
      'argocd',
      'gitlab',
      'nexus',
      'quay',
      'sonarqube',
      'vault',
    ],
    projectName: 'CloudPiNative',
    ...project,
  }

  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
    .getByDataTestid('menuServices').click()
    .getByDataTestid('orderProjectLink').click()
    .get('h1').should('contain', 'Commander un espace projet')
    .getByDataTestid('orderProjectBtn').should('be.disabled')
    .get('[data-testid^="repoFieldset-"]').should('not.exist')
    .get('p.fr-alert__description').should('contain', newProject.owner.email)
    .getByDataTestid('orgNameSelect').find('select').select('ministere-interieur')
    .getByDataTestid('projectNameInput').type(`${newProject.projectName} ErrorSpace`)
    .getByDataTestid('projectNameInput').should('have.class', 'fr-input--error')
    .getByDataTestid('orderProjectBtn').should('be.disabled')
    .getByDataTestid('projectNameInput').clear().type(newProject.projectName)
    .getByDataTestid('projectNameInput').should('not.have.class', 'fr-input--error')
    .getByDataTestid('orderProjectBtn').should('be.enabled')

  if (newProject.repo.length) {
    newProject.repo.forEach((repo, index) => {
      cy.getByDataTestid('addRepoBtn').click()
        .getByDataTestid('orderProjectBtn').should('be.disabled')
        .get('[data-testid^="repoFieldset-"]').should('have.length', index + 1)
        .getByDataTestid(`gitNameInput-${index}`).type(repo.gitName)
        .getByDataTestid('orderProjectBtn').should('be.enabled')
        .getByDataTestid(`userNameInput-${index}`).type(repo.userName)
        .getByDataTestid(`gitSrcNameInput-${index}`).type(repo.gitSourceName)

      if (repo.gitToken) {
        cy.getByDataTestid(`privateRepoCbx-${index}`).find('input[type="checkbox"]').check({ force: true })
          .getByDataTestid('orderProjectBtn').should('be.disabled')
          .getByDataTestid(`gitTokenInput-${index}`).type(repo.gitToken)
          .getByDataTestid('orderProjectBtn').should('be.enabled')
      }
    })
  }

  cy.getByDataTestid('orderProjectBtn').click()
  cy.wait('@postProject').its('response.statusCode').should('eq', 201)
})

Cypress.Commands.add('assertOrderProject', (projectName) => {
  cy.visit('/')
    .getByDataTestid('menuProjectsBtn').click()
    .getByDataTestid('menuDashboard').click()
    .selectProject(projectName)
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
