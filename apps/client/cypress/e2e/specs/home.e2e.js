import { getUserById } from '../support/func.js'

const user = getUserById('cb8e5b4b-7b7b-40f5-935f-594f48ae6567')

describe('Header', () => {
  it('Should display application Header', () => {
    cy.visit('/')
      .get('.fr-header__service')
      .should('contain', 'Console Cloud PI Native')
      .get('.fr-header__service-tagline')
      .should('not.exist')
  })

  it('Should display name once logged', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .visit('/')
      .getByDataTestid('whoami-hint')
      .should('contain', `${user.firstName} ${user.lastName}`)
  })
})
