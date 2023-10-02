import { getModelById } from '../support/func'

describe('Add repos into project', () => {
  const project = { name: 'project10' }
  const projectWithFailedRepo = getModelById('project', '83833faf-f654-40dd-bcd5-cf2e944fc702')

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project.name}`).click()
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
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.getByDataTestid('addRepoLink').click({ timeout: 30_000 })
      .get('h1').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('internalRepoNameInput').find('input').clear().type(repo.internalRepoName)
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl)
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('internalRepoNameInput').find('input').clear().type('$%_>')
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'Le nom du dépôt ne doit contenir ni espaces ni caractères spéciaux')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('internalRepoNameInput').find('input').clear().type(repo.internalRepoName)
      .get('.fr-error-text')
      .should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl.slice(0, -4))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl.slice(8))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl.replace(/s/i, ''))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl)
      .get('.fr-error-text')
      .should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').check({ force: true })
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalUserNameInput').find('input').type(repo.externalUserName)
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalTokenInput').find('input').clear().type(repo.externalToken)
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('externalTokenInput').find('input').clear()
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'Le token d\'accès au dépôt est obligatoire en cas de dépôt privé et ne doit contenir ni espaces ni caractères spéciaux')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').uncheck({ force: true })
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').check({ force: true })
      .getByDataTestid('addRepoBtn').should('be.enabled')
  })

  it('Should display repositories statuses', () => {
    const repos = projectWithFailedRepo.repositories

    cy.assertAddRepo(projectWithFailedRepo, repos)
      .getByDataTestid(`${repos.find(repo => repo.status === 'created').internalRepoName}-created-badge`)
      .should('contain', 'Dépôt correctement déployé')
      .getByDataTestid(`${repos.find(repo => repo.status === 'failed').internalRepoName}-failed-badge`)
      .should('contain', 'Echec des opérations')
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
      externalUserName: 'externalUser04',
      externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should update a repo', () => {
    cy.intercept('GET', '/api/v1/projects').as('getProjects')
    cy.intercept('PUT', '/api/v1/projects/*/repositories/*').as('putRepo')
    let repos

    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuRepos').click()
      .url().should('contain', '/repositories')

    cy.wait('@getProjects').its('response').then(response => {
      repos = response.body.find(resProject => resProject.name === project.name).repositories
      cy.getByDataTestid(`repoTile-${repos[0].internalRepoName}`).click()
        .get('h1').should('contain', 'Modifier le dépôt')
        .getByDataTestid('internalRepoNameInput').should('be.disabled')
        .getByDataTestid('externalRepoUrlInput').find('input').clear().type('https://github.com/externalUser04/new-repo.git')

      cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').check({ force: true })
        .getByDataTestid('externalUserNameInput').find('input').type('newUser')
        .getByDataTestid('externalTokenInput').find('input').clear().type('newToken')

      cy.getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').should('be.disabled')

      cy.getByDataTestid('updateRepoBtn').click()
      cy.wait('@putRepo').its('response.statusCode').should('eq', 200)
      cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
      cy.getByDataTestid(`repoTile-${repos[0].internalRepoName}`).should('exist')
      cy.reload()
      cy.getByDataTestid(`repoTile-${repos[0].internalRepoName}`).click()
        .getByDataTestid('externalRepoUrlInput').find('input').should('have.value', 'https://github.com/externalUser04/new-repo.git')
        .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').should('be.checked')
        .getByDataTestid('externalUserNameInput').find('input').should('have.value', 'newUser')
        .getByDataTestid('externalTokenInput').find('input').should('have.value', '')
    })
  })

  it('Should generate a GitLab CI for a repo', () => {
    cy.intercept('POST', '/api/v1/projects/*/repositories').as('postRepo')
    cy.intercept('GET', '/api/v1/projects').as('getProjects')

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
      .getByDataTestid('internalRepoNameInput').find('input').type(repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').find('input').clear().type(repo.externalRepoUrl)

    cy.getByDataTestid('gitlabCIAccordion').click()
      .get('legend').should('contain', 'Générer des fichiers de GitLab CI pour ce dépôt')
      .getByDataTestid('generatedCI').should('not.exist')

    cy.generateGitLabCI(ciForms)

    cy.getByDataTestid('addRepoBtn').click()
    cy.wait('@postRepo').its('response.statusCode').should('eq', 201)
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
    cy.getByDataTestid(`repoTile-${repo.internalRepoName}`).should('exist')
    cy.wait(1000).reload()
    cy.wait('@getProjects').its('response.statusCode').should('eq', 200)
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
})
