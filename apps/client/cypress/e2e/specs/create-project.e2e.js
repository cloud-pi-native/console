describe('Create Project', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    const project = { projectName: 'project01' }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })

  it('Should create a project with defined env', () => {
    const project = { projectName: 'project02', envList: ['dev', 'staging'] }

    cy.createProject(project)
    cy.assertCreateProject(project.projectName)
  })
})
