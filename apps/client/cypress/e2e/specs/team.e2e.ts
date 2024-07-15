import { getModelById } from '../support/func.js'

const project = getModelById('project', '22e7044f-8414-435d-9c4a-2df42a65034b')
const newMember = getModelById('user', '89e5d1ca-3194-4b0a-b226-75a5f4fe6a34')

describe('Team view', () => {
  beforeEach(() => {
    cy.kcLogin('test')
  })

  it('Should display team members', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })

  it('Should not add a non-existing team member', () => {
    cy.goToProjects()
      .getByDataTestid(`projectTile-${project.name}`).click()
      .getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
      .getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type('jenexistepas@criseexistentielle.com')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()

    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', 'Utilisateur introuvable')
    })

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })

  it('Should add a team member', () => {
    cy.intercept('POST', `api/v1/projects/${project.id}/users`).as('addUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type('test@test.com')
    cy.getByDataTestid('userErrorInfo')
      .should('contain', 'L\'utilisateur associé à cette adresse e-mail fait déjà partie du projet.')
    cy.getByDataTestid('addUserBtn')
      .should('be.disabled')
    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()

    cy.getByDataTestid('addUserSuggestionInput')
      .find('input')
      .clear()
      .type(newMember.email)
    cy.getByDataTestid('userErrorInfo')
      .should('not.exist')
    cy.getByDataTestid('addUserBtn')
      .should('be.enabled').click()
    cy.wait('@addUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
  })

  it('Should transfert owner role to a team member', () => {
    const owner = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')
    const userToTransfer = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6569')

    cy.intercept(`/api/v1/projects/${project.id}/users/${userToTransfer.id}`).as('transferOwnership1')
    cy.intercept(`/api/v1/projects/${project.id}/users/${owner.id}`).as('transferOwnership2')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('not.exist')

    cy.getByDataTestid('ownerTag')
      .should('have.length', 1)

    cy.get(`select#roleSelect-${userToTransfer.id}`)
      .should('have.value', 'user')
      .and('be.enabled')
      .select('owner')

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('exist')
    cy.getByDataTestid('confirmUpdateBtn')
      .click()

    cy.wait('@transferOwnership1')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('ownerTag')
      .should('have.length', 1)

    cy.get(`select#roleSelect-${owner.id}`)
      .should('have.value', 'user')
      .and('be.disabled')

    cy.kcLogin((userToTransfer.firstName.slice(0, 1) + userToTransfer.lastName).toLowerCase())

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('not.exist')

    cy.getByDataTestid('ownerTag')
      .should('have.length', 1)

    cy.get(`select#roleSelect-${owner.id}`)
      .should('have.value', 'user')
      .and('be.enabled')
      .select('owner')

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('exist')
    cy.getByDataTestid('confirmUpdateBtn')
      .click()

    cy.wait('@transferOwnership2')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('ownerTag')
      .should('have.length', 1)

    cy.get(`select#roleSelect-${userToTransfer.id}`)
      .should('have.value', 'user')
      .and('be.disabled')
  })

  it('Should be able to transfer owner role as admin', () => {
    const admin = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6566')

    cy.kcLogin((admin.firstName.slice(0, 1) + admin.lastName).toLowerCase())
    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('not.exist')

    cy.getByDataTestid('ownerTag')
      .should('have.length', 1)

    cy.get('select:first')
      .should('have.value', 'user')
      .and('be.enabled')
      .select('owner')

    cy.getByDataTestid('confirmTransferingRoleZone')
      .should('exist')
    cy.getByDataTestid('cancelUpdateBtn')
      .click()

    cy.get('select:first')
      .should('have.value', 'user')
      .and('be.enabled')
  })

  it('Should remove a team member', () => {
    cy.intercept('DELETE', `api/v1/projects/${project.id}/users/*`).as('removeUser')

    cy.goToProjects()
    cy.getByDataTestid(`projectTile-${project.name}`).click()
    cy.getByDataTestid('menuTeam').click()
      .url().should('contain', `/projects/${project.id}/team`)
    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length + 1)
      .get(`td[title="retirer ${newMember.email} du projet"]`)
      .click()
    cy.wait('@removeUser')
      .its('response.statusCode')
      .should('match', /^20\d$/)

    cy.getByDataTestid('teamTable')
      .find('tbody > tr')
      .should('have.length', project.users.length)
  })
})
