describe('Add repos into project', () => {
  const project = { projectName: 'project10' }

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project.projectName}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with one external public repo', () => {
    const repos = [{
      internalRepoName: 'repo01',
      externalRepoUrl: 'https://github.com/externalUser01/repo01',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with one external private repo', () => {
    const repos = [{
      internalRepoName: 'repo02',
      externalRepoUrl: 'https://github.com/externalUser02/repo02',
      isInfra: false,
      isPrivate: true,
      externalUserName: 'externalUser02',
      externalToken: 'xxxxxxxx',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with two external infra repos', () => {
    const repos = [{
      internalRepoName: 'repo03',
      externalRepoUrl: 'https://github.com/externalUser02/repo03',
      isInfra: true,
      isPrivate: true,
      externalUserName: 'externalUser03',
      externalToken: 'xxxxxxxx',
    },
    {
      internalRepoName: 'repo04',
      externalRepoUrl: 'https://github.com/externalUser02/repo04',
      isInfra: true,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with multiple external repos', () => {
    const repos = [{
      internalRepoName: 'repo05',
      externalRepoUrl: 'https://github.com/externalUser03/repo05',
      isPrivate: true,
      isInfra: false,
      externalUserName: 'externalUser05',
      externalToken: 'xxxxxxxx',
    },
    {
      internalRepoName: 'repo06',
      externalRepoUrl: 'https://github.com/externalUser03/repo06',
    },
    {
      internalRepoName: 'repo07',
      externalRepoUrl: 'https://github.com/externalUser03/repo08',
      isInfra: true,
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })
})
