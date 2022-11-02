describe('Add repos into project', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  before(() => {
    cy.kcLogin('test')

    const project = { projectName: 'project10' }
    cy.createProject(project)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project.projectName}`).click()
  })

  it('Should create a project with one external repo', () => {
    const repos = [{
      gitName: 'repo01',
      userName: 'externalUser01',
      gitSourceName: 'https://github.com/externalUser01/repo01',
    }]

    cy.addRepo(repos)
    cy.assertAddRepo(repos)
  })

  it('Should create a project with one external private repo', () => {
    const repos = [{
      gitName: 'repo01',
      userName: 'externalUser01',
      gitSourceName: 'https://github.com/externalUser01/repo01',
      gitToken: 'xxxxxxxx',
    }]

    cy.addRepo(repos)
    cy.assertAddRepo(repos)
  })

  it('Should create a project with multiple external repos', () => {
    const repos = [{
      gitName: 'repo01',
      userName: 'externalUser01',
      gitSourceName: 'https://github.com/externalUser01/repo01',
      gitToken: 'xxxxxxxx',
    },
    {
      gitName: 'repo02',
      userName: 'externalUser02',
      gitSourceName: 'https://github.com/externalUser02/repo02',
      gitToken: 'xxxxxxxx',
    }]

    cy.addRepo(repos)
    cy.assertAddRepo(repos)
  })
})
