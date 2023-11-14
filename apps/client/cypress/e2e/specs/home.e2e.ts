import { getModelById } from '../support/func'

const user = getModelById('user', 'cb8e5b4b-7b7b-40f5-935f-594f48ae6567')

describe('Header', () => {
  it('Should display application Header', () => {
    cy.visit('/')
      .get('.fr-header__service')
      .should('contain', 'Console Cloud π Native')
      .get('.fr-header__service-tagline')
      .should('not.exist')
  })

  it('Should display name once logged', () => {
    cy.kcLogin((user.firstName.slice(0, 1) + user.lastName).toLowerCase())
      .visit('/')
      .getByDataTestid('whoami-hint')
      .should('contain', `${user.firstName} ${user.lastName}`)
  })

  it('Should display app version and swagger', () => {
    cy.visit('/')
    cy.getByDataTestid('swaggerUrl')
      .should('have.attr', 'href', `${window?.location?.origin}/api/v1/swagger-ui/static/index.html`)
    cy.getByDataTestid('appVersionUrl')
      .contains('vpr-')
      .invoke('attr', 'href')
      .should('match', /https:\/\/github.com\/cloud-pi-native\/console\/releases\/tag\/vpr-/)
  })
})
