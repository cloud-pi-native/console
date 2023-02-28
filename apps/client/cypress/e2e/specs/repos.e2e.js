describe('Add repos into project', () => {
  const project = { name: 'project10' }

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
      .getByDataTestid('internalRepoNameInput').clear().type(repo.internalRepoName)
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('internalRepoNameInput').clear().type('$%_>')
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'Le nom du dépôt ne doit contenir ni espaces ni caractères spéciaux')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('internalRepoNameInput').clear().type(repo.internalRepoName)
      .get('.fr-error-text')
      .should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.slice(0, -4))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.slice(8))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl.replace(/s/i, ''))
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'L\'url du dépôt doit commencer par https et se terminer par .git')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalRepoUrlInput').clear().type(repo.externalRepoUrl)
      .get('.fr-error-text')
      .should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').check({ force: true })
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalUserNameInput').type(repo.externalUserName)
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('externalTokenInput').clear().type(repo.externalToken)
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('externalTokenInput').clear()
      .get('.fr-error-text')
      .should('have.length', 1)
      .and('contain', 'Le token d\'accès au dépôt est obligatoire en cas de dépôt privé et ne doit contenir ni espaces ni caractères spéciaux')
      .getByDataTestid('addRepoBtn').should('be.disabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').uncheck({ force: true })
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').check({ force: true })
      .getByDataTestid('addRepoBtn').should('be.enabled')
  })

  it('Should create a project with one external public repo', () => {
    const repos = [{
      internalRepoName: 'repo01',
      externalRepoUrl: 'https://github.com/externalUser01/repo01.git',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with one external private repo', () => {
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

  it('Should create a project with two external infra repos', () => {
    const repos = [{
      internalRepoName: 'repo03',
      externalRepoUrl: 'https://github.com/externalUser03/repo03.git',
      isInfra: true,
      isPrivate: true,
      externalUserName: 'externalUser03',
      externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
    },
    {
      internalRepoName: 'repo04',
      externalRepoUrl: 'https://github.com/externalUser04/repo04.git',
      isInfra: true,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with multiple external repos', () => {
    const repos = [{
      internalRepoName: 'repo05',
      externalRepoUrl: 'https://github.com/externalUser05/repo05.git',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'externalUser05',
      externalToken: 'hoqjC1vXtABzytBIWBXsdyzubmqMYkgA',
    },
    {
      internalRepoName: 'repo06',
      externalRepoUrl: 'https://github.com/externalUser06/repo06.git',
    },
    {
      internalRepoName: 'repo07',
      externalRepoUrl: 'https://github.com/externalUser07/repo07.git',
      isInfra: true,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should generate a GitLab CI for a repo', () => {
    const repo = {
      internalRepoName: 'repo08',
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
      {
        internalRepoName: 'repo05',
      },
      {
        internalRepoName: 'repo06',
      },
      {
        internalRepoName: 'repo07',
      },
    ]

    cy.deleteRepo(project, repos[0])
    cy.assertAddRepo(project, repos.slice(1))
  })
})
