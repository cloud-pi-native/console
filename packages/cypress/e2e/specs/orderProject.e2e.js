describe('Order Project', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should order a project with minimal form informations', () => {
    const project = { projectName: 'project01' }

    cy.orderProject(project)
    cy.assertOrderProject(project.projectName)
  })

  it('Should order a project with one external repo', () => {
    const project = {
      projectName: 'project02',
      repo: [{
        gitName: 'repo01',
        userName: 'externalUser01',
        gitSourceName: 'externalRepo01',
      }],
    }

    cy.orderProject(project)
    cy.assertOrderProject(project.projectName)
  })

  it('Should order a project with one external private repo', () => {
    const project = {
      projectName: 'project03',
      repo: [{
        gitName: 'repo01',
        userName: 'externalUser01',
        gitSourceName: 'externalRepo01',
        gitToken: 'xxxxxxxx',
      }],
    }

    cy.orderProject(project)
    cy.assertOrderProject(project.projectName)
  })

  it('Should order a project with multiple external repos', () => {
    const project = {
      projectName: 'project04',
      repo: [
        {
          gitName: 'repo01',
          userName: 'externalUser01',
          gitSourceName: 'externalRepo01',
          gitToken: 'xxxxxxxx',
        },
        {
          gitName: 'repo02',
          userName: 'externalUser02',
          gitSourceName: 'externalRepo02',
          gitToken: 'xxxxxxxx',
        },
      ],
    }

    cy.orderProject(project)
    cy.assertOrderProject(project.projectName)
  })
})
