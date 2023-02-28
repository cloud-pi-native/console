describe('Create Project', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should create a project with minimal form informations', () => {
    const project = { name: 'project01' }

    cy.createProject(project)
    cy.assertCreateProjects([project.name])
  })
})
