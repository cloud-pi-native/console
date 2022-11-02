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
      gitName: 'repo01',
      gitSourceName: 'https://github.com/externalUser01/repo01',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with one external private repo', () => {
    const repos = [{
      gitName: 'repo02',
      gitSourceName: 'https://github.com/externalUser02/repo02',
      isPrivate: true,
      userName: 'externalUser02',
      gitToken: 'xxxxxxxx',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })

  it('Should create a project with multiple external repos', () => {
    const repos = [{
      gitName: 'repo03',
      gitSourceName: 'https://github.com/externalUser03/repo03',
      isPrivate: true,
      userName: 'externalUser03',
      gitToken: 'xxxxxxxx',
    },
    {
      gitName: 'repo04',
      gitSourceName: 'https://github.com/externalUser03/repo04',
    }]

    cy.addRepos(project, repos)
    cy.assertAddRepo(project, repos)
  })
})
