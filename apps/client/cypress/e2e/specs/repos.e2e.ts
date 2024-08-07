import { getModelById } from '../support/func.js'

describe('Add repos into project', () => {
  const project = { name: 'project10' }
  const projectFailed = getModelById('project', '83833faf-f654-40dd-bcd5-cf2e944fc702')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project)

    cy.getByDataTestid('menuMyProjects').click()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should handle repository schema validation', () => {
    const repo = {
      internalRepoName: 'repo00',
      externalRepoUrl: 'https://github.com/externalUser01/repo00.git',
      externalUserName: 'user',
      externalToken: 'videnden88EHEBdldd_T0k9n',
    }

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuRepos').click()
    cy.url().should('contain', '/repositories')

    cy.getByDataTestid('addRepoLink').click({ timeout: 30_000 })
    cy.get('h2').should('contain', 'Ajouter un dépôt au projet')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('internalRepoNameInput').clear().type(repo.internalRepoName)
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('internalRepoNameInput').clear().type('$%_>')
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'Le nom du dépôt ne doit contenir ni majuscules, ni espaces, ni caractères spéciaux hormis le trait d\'union, et doit commencer et se terminer par un caractère alphanumérique')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('internalRepoNameInput').clear().type(repo.internalRepoName)
      .get('.fr-error-text')
      .should('not.exist')
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.slice(0, -4))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.slice(8))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.replace(/s/i, ''))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)
      .get('.fr-error-text')
      .should('not.exist')
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalUserNameInput').type(repo.externalUserName)
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalTokenInput').clear().type(repo.externalToken)
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput').clear()
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').uncheck({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('input-checkbox-infraRepoCbx').check({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
  })

  it('Should add an external public repo', () => {
    const repos = [{
      internalRepoName: 'repo01',
      externalRepoUrl: 'https://github.com/externalUser01/repo01.git',
      isInfra: false,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should add an external private repo', () => {
    const repos = [{
      internalRepoName: 'repo02',
      externalRepoUrl: 'https://github.com/externalUser02/repo02.git',
      isInfra: false,
      isPrivate: true,
      externalUserName: 'externalUser02',
      externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should add an external public infra repo', () => {
    const repos = [{
      internalRepoName: 'repo03',
      externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
      isInfra: true,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should add an external private infra repo', () => {
    const repos = [{
      internalRepoName: 'repo04',
      externalRepoUrl: 'https://github.com/externalUser04/repo04.git',
      isInfra: true,
      isPrivate: true,
      externalUserName: 'externalUser+04',
      externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should update a repo', () => {
    cy.intercept('GET', '/api/v1/repositories?projectId=*').as('listRepositories')
    cy.intercept('PUT', '/api/v1/repositories/*').as('putRepo')
    let repositories = []

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.wait('@listRepositories').its('response').then(response => {
      repositories = response.body
      cy.getByDataTestid(`repoTile-${repositories[0].internalRepoName}`).click()
        .get('h2').should('contain', 'Modifier le dépôt')
        .getByDataTestid('internalRepoNameInput').should('be.disabled')
        .getByDataTestid('externalRepoUrlInput').clear().type('https://github.com/externalUser04/new-repo.git')

      cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
        .getByDataTestid('externalUserNameInput').type('newUser')
        .getByDataTestid('externalTokenInput').clear().type('newToken')

      cy.getByDataTestid('input-checkbox-infraRepoCbx').should('be.enabled')

      cy.getByDataTestid('updateRepoBtn').click()
      cy.wait('@putRepo').its('response.statusCode').should('match', /^20\d$/)
      cy.wait('@listRepositories').its('response.statusCode').should('match', /^20\d$/)
      cy.getByDataTestid(`repoTile-${repositories[0].internalRepoName}`).should('exist')
      cy.reload()
      cy.getByDataTestid(`repoTile-${repositories[0].internalRepoName}`).click()
      cy.getByDataTestid('externalRepoUrlInput').should('have.value', 'https://github.com/externalUser04/new-repo.git')
      cy.getByDataTestid('input-checkbox-privateRepoCbx').should('be.checked')
      cy.getByDataTestid('externalUserNameInput').should('have.value', 'newUser')
      cy.getByDataTestid('externalTokenInput').should('have.value', '')
    })
  })

  it('Should synchronise a repo', () => {
    cy.intercept('GET', '/api/v1/repositories?projectId=*').as('listRepositories')
    cy.intercept('POST', '/api/v1/repositories/*/sync').as('syncRepo')
    let repositories = []

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.wait('@listRepositories').its('response').then(response => {
      repositories = response.body

      cy.getByDataTestid(`repoTile-${repositories[0].internalRepoName}`)
        .click()

      cy.get('h2').should('contain', 'Synchroniser le dépôt')
      cy.getByDataTestid('branchNameInput')
        .should('have.value', 'main')

      cy.getByDataTestid('syncRepoBtn')
        .should('be.enabled')
        .click()

      cy.wait('@syncRepo').its('response.statusCode').should('match', /^20\d$/)

      cy.getByDataTestid('snackbar').within(() => {
        cy.get('p').should('contain', `Job de synchronisation lancé pour le dépôt ${repositories[0].internalRepoName}`)
      })

      cy.getByDataTestid('branchNameInput')
        .clear()

      cy.getByDataTestid('syncRepoBtn')
        .should('be.disabled')

      cy.getByDataTestid('branchNameInput')
        .type('develop')

      cy.getByDataTestid('syncRepoBtn')
        .should('be.enabled')
        .click()

      cy.wait('@syncRepo').its('response.statusCode').should('match', /^20\d$/)

      cy.getByDataTestid('snackbar').within(() => {
        cy.get('p').should('contain', `Job de synchronisation lancé pour le dépôt ${repositories[0].internalRepoName}`)
      })
    })
  })

  it('Should generate a GitLab CI for a repo', () => {
    cy.intercept('POST', '/api/v1/repositories').as('postRepo')
    cy.intercept('GET', '/api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')

    const repo = {
      internalRepoName: 'repo05',
      externalRepoUrl: 'https://github.com/externalUser08/repo08.git',
    }

    const ciForms = [{
      language: 'node',
      version: '18.2.1',
      install: 'npm install',
      build: 'npm build',
      workingDir: './client',
    },
    {
      language: 'java',
      version: '13.1.1',
      artefactDir: './**/*.jar',
      workingDir: './',
    }]

    cy.visit('/')
      .getByDataTestid('menuProjectsBtn').click()
      .getByDataTestid('menuMyProjects').click()
      .url().should('contain', '/projects')
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.getByDataTestid('addRepoLink').click()
      .getByDataTestid('internalRepoNameInput').type(repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)

    cy.getByDataTestid('gitlabCIAccordion').click()
      .get('legend').should('contain', 'Générer des fichiers de GitLab CI pour ce dépôt')
      .getByDataTestid('generatedCI').should('not.exist')

    cy.generateGitLabCI(ciForms)

    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('match', /^20\d$/)
    cy.wait('@listProjects').its('response.statusCode').should('match', /^20\d$/)
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
    cy.wait(1000).reload()
    cy.wait('@listProjects').its('response.statusCode').should('match', /^20\d$/)
    cy.assertAddRepo(project, [repo])
  })

  it('Should delete a repo', () => {
    const repos = [
      {
        internalRepoName: 'repo01',
      },
      {
        internalRepoName: 'repo02',
      },
      {
        internalRepoName: 'repo03',
      },
      {
        internalRepoName: 'repo04',
      },
    ]

    cy.deleteRepo(project, repos[0])
    cy.assertAddRepo(project, repos.slice(1))
  })

  it('Should not be able to delete a repository if not owner', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
    cy.goToProjects()
    cy.get('[data-testid^="projectTile-"]:first').click()
      .getByDataTestid('menuRepos').click()

    cy.get('[data-testid^="repoTile-"]:first').click()
      .getByDataTestid('repo-form').should('exist')
      .getByDataTestid('deleteRepoZone').should('not.exist')
  })

  it('Should not be able to delete a repository if project locked', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${projectFailed.name}`).click()
      .getByDataTestid('menuRepos').click()

    cy.get('[data-testid^="repoTile-"]:first').click()
      .getByDataTestid('repo-form').should('exist')

    cy.getByDataTestid('showDeleteRepoBtn').should('be.disabled')
  })
})
