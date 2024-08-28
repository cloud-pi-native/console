import { type Repo, fakeToken } from '@cpn-console/shared'
import { getModelById } from '../support/func.js'

describe('Add repos into project', () => {
  const project = getModelById('project', '554d9150-9a07-42c1-8207-1163f2f0addd')
  const projectFailed = getModelById('project', '83833faf-f654-40dd-bcd5-cf2e944fc702')
  const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567')

  beforeEach(() => {
    cy.intercept('GET', '/api/v1/repositories?projectId=*').as('listRepositories')
    cy.intercept('POST', '/api/v1/repositories').as('postRepo')
    cy.intercept('PUT', '/api/v1/repositories/*').as('putRepo')
    cy.intercept('POST', '/api/v1/repositories/*/sync').as('syncRepo')
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
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
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
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput').clear().type(repo.externalToken)
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalUserNameInput').clear()
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput').clear()
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').uncheck({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('input-checkbox-infraRepoCbx').check({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
  })

  it('Should add a standalone public repo', () => {
    const repo = {
      internalRepoName: 'repo00',
      isInfra: false,
    }

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.getByDataTestid('addRepoLink').click()
      .get('h2').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('internalRepoNameInput').type(repo.internalRepoName)
    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('eq', 201)
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`)
      .should('exist')
      .click()
    cy.get('h2')
      .contains('Synchroniser le dépôt')
      .should('not.exist')
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
    let repositories = []

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.wait('@listRepositories').its('response').then((response) => {
      repositories = response.body
      cy.getByDataTestid(`repoTile-${repositories[1].internalRepoName}`).click()
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
      cy.getByDataTestid(`repoTile-${repositories[1].internalRepoName}`).should('exist')
      cy.reload()
      cy.getByDataTestid(`repoTile-${repositories[1].internalRepoName}`).click()
      cy.getByDataTestid('externalRepoUrlInput').should('have.value', 'https://github.com/externalUser04/new-repo.git')
      cy.getByDataTestid('input-checkbox-privateRepoCbx').should('be.checked')
      cy.getByDataTestid('externalUserNameInput').should('have.value', 'newUser')
      cy.getByDataTestid('externalTokenInput').should('have.value', fakeToken)
    })
  })

  it('Should synchronise a repo', () => {
    let repositories: Repo[] = []

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.wait('@listRepositories').its('response').then((response) => {
      repositories = response.body

      cy.getByDataTestid(`repoTile-${repositories[1].internalRepoName}`)
        .click()

      cy.get('h2').should('contain', 'Synchroniser le dépôt')
      cy.getByDataTestid('branchNameInput')
        .should('have.value', 'main')
        .and('be.enabled')

      cy.getByDataTestid('syncRepoBtn')
        .should('be.enabled')

      cy.getByDataTestid('toggleSyncAllBranches')
        .find('input')
        .check({ force: true })

      cy.getByDataTestid('branchNameInput')
        .should('not.exist')

      cy.getByDataTestid('syncRepoBtn')
        .should('be.enabled')

      cy.getByDataTestid('toggleSyncAllBranches')
        .find('input')
        .uncheck({ force: true })

      cy.getByDataTestid('branchNameInput')
        .should('have.value', 'main')
        .and('be.enabled')

      cy.getByDataTestid('syncRepoBtn')
        .should('be.enabled')
        .click()

      cy.wait('@syncRepo').its('response.statusCode').should('match', /^20\d$/)

      cy.getByDataTestid('snackbar').within(() => {
        cy.get('p').should('contain', `Job de synchronisation lancé pour le dépôt ${repositories[1].internalRepoName}`)
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
        cy.get('p').should('contain', `Job de synchronisation lancé pour le dépôt ${repositories[1].internalRepoName}`)
      })
    })
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

    cy.getByDataTestid('showDeleteRepoBtn').should('not.exist')
  })
})
