describe('Create Project', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    const project = { projectName: 'project01' }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })

  it.skip('Should create a project with one external repo', () => {
    const project = {
      projectName: 'project02',
      repo: [{
        gitName: 'repo01',
        userName: 'externalUser01',
        gitSourceName: 'https://github.com/externalUser01/repo01',
      }],
    }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })

  it.skip('Should create a project with one external private repo', () => {
    const project = {
      projectName: 'project03',
      repo: [{
        gitName: 'repo01',
        userName: 'externalUser01',
        gitSourceName: 'https://github.com/externalUser01/repo01',
        gitToken: 'xxxxxxxx',
      }],
    }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })

  it.skip('Should create a project with multiple external repos', () => {
    const project = {
      projectName: 'project04',
      repo: [
        {
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
        },
      ],
    }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })
})
