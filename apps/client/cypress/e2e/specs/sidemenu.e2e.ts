import { getModelById } from '../support/func'

const project = getModelById('project', '011e7860-04d7-461f-912d-334c622d38b3')

describe('Sidemenu', () => {
  it('Should display Sidemenu, not loggedIn', () => {
    cy.visit('/')
      .getByDataTestid('mainMenu').should('be.visible')
      .getByDataTestid('menuProjectBtn').should('not.exist')
      .getByDataTestid('menuDoc').should('be.visible')
      .getByDataTestid('menuAdministrationList').should('not.exist')
      .getByDataTestid('menuAdministrationBtn').should('not.exist')
  })
  it('Should display Sidemenu, loggedIn, isNotAdmin', () => {
    cy.kcLogin('test')

    cy.visit('/')
      .getByDataTestid('mainMenu').should('be.visible')
      .getByDataTestid('menuMyProjects').click()
      .url().should('contain', '/projects')
      .getByDataTestid(`projectTile-${project.slug}`).click()
      .url().should('contain', `/projects/${project.slug}`)
  })

  it('Should display Sidemenu, loggedIn, isAdmin', () => {
    cy.kcLogin('tcolin')

    cy.visit('/')
      .getByDataTestid('mainMenu').should('be.visible')
      .getByDataTestid('menuAdministrationList').should('not.be.visible')

      // Projects
      .getByDataTestid('menuMyProjects').click()
      .getByDataTestid('menuAdministrationList').should('not.be.visible')
      .url().should('contain', '/projects')
      .getByDataTestid(`projectTile-${project.slug}`).click()
      .getByDataTestid('menuAdministrationList').should('not.be.visible')
      .url().should('contain', `/projects/${project.slug}`)

      // Doc
      .getByDataTestid('menuDoc').should('be.visible')
      .getByDataTestid('menuAdministrationList').should('not.be.visible')

      // Admin
      .getByDataTestid('menuAdministrationBtn').click()
      .getByDataTestid('menuAdministrationList').should('be.visible')
      .getByDataTestid('menuAdministrationUsers').click()
      .getByDataTestid('menuAdministrationUsers').should('have.class', 'router-link-active')
      .getByDataTestid('menuAdministrationList').should('be.visible')
      .url().should('contain', '/admin/users')
  })
})
