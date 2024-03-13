import { getModelById } from '../support/func.js'

const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6565')

describe('Redirect to 404 if page not found', () => {
  it('should redirect loggedout user to 404 if page not found', () => {
    cy.visit('/nowhere')
    cy.url().should('contain', '/404')
    cy.getByDataTestid('whoami-hint')
      .should('not.exist')
  })
  it('should redirect loggedin user to 404 if page not found', () => {
    cy.kcLogin('test')
    cy.visit('/nowhere')
    cy.url().should('contain', '/404')
    cy.getByDataTestid('whoami-hint')
      .should('contain', `${user.firstName} ${user.lastName}`)
  })
})
