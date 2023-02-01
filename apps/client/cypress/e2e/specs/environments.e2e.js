describe('Add environments into project', () => {
  const project = { name: 'project11' }

  before(() => {
    cy.kcLogin('test')

    cy.createProject(project)

    cy.getByDataTestid('menuMyProjects').click()
      .getByDataTestid(`projectTile-${project.name}`).click()
  })

  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should add environments to an existing project', () => {
    const environments = ['prod', 'dev']

    cy.addEnvironment(project, environments)
    cy.assertAddEnvironment(project, environments)
  })
})
