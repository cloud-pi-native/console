import { getModel } from '../../support/func.js'

describe('Administration organizations', () => {
  const organizations = getModel('organizations').map(({ label, name, active }) => ({
    label,
    name,
    active,
  }))

  const newOrg = {
    label: 'Ministère de la chambre jaune',
    name: 'mcj',
    invalidName: 'Inv4L!d3...',
    takenName: organizations[0].name,
  }

  beforeEach(() => {
    cy.intercept('GET', 'api/v1/admin/organizations').as('getAllOrganizations')

    cy.kcLogin('tcolin')
    cy.visit('/admin/organizations')
    cy.wait('@getAllOrganizations').its('response.statusCode').should('eq', 200)
  })

  it('Should display organizations table, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      organizations.forEach(organization => {
        cy.getByDataTestid(`${organization.name}-label-input`)
          .should('have.value', organization.label)
        cy.getByDataTestid(`${organization.name}-active-cbx`)
          .should(organization.active ? 'be.checked' : 'not.be.checked')
      })
    })
  })

  it('Should create an organization loggedIn as admin', () => {
    cy.getByDataTestid('orgLabelInput')
      .clear()
      .type(newOrg.label)
    cy.getByDataTestid('addOrgBtn')
      .should('be.disabled')
    cy.getByDataTestid('orgNameInput')
      .clear()
      .type(newOrg.takenName)
    cy.getByDataTestid('addOrgBtn')
      .should('be.disabled')
    cy.getByDataTestid('orgErrorInfo')
      .should('be.visible')
    cy.getByDataTestid('orgNameInput')
      .clear()
      .type(newOrg.invalidName)
    cy.getByDataTestid('addOrgBtn')
      .should('be.disabled')
    cy.getByDataTestid('orgNameInput')
      .clear()
      .type(newOrg.name)
    cy.getByDataTestid('addOrgBtn')
      .should('be.enabled')
      .click()

    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Organisation ${newOrg.name} créée`)
    })

    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${newOrg.name}-label-input`)
        .should('have.value', newOrg.label)
      cy.getByDataTestid(`${newOrg.name}-active-cbx`)
        .should('be.checked')
    })

    cy.visit('/projects/create-project')
      .get('select#organizationId-select')
      .select(newOrg.label)
      .should('have.value', newOrg.name)
  })

  it('Should update an organization loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${newOrg.name}-label-input`)
        .should('have.value', newOrg.label)
        .clear()
        .type('Ministère de la chambre rouge')
        .blur()
    })
    cy.getByDataTestid('snackbar').should('contain', `Organisation ${newOrg.name} mise à jour`)

    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${newOrg.name}-active-cbx`)
        .should('be.checked')
        .uncheck()
        .blur()
    })
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Organisation ${newOrg.name} mise à jour`)
    })

    cy.visit('/projects/create-project')
      .get(`select#organizationId-select > option[value="${organizations[0].name}"]`)
      .should('not.exist')
      .get(`select#organizationId-select > option[value="${newOrg.name}"]`)
      .should('not.exist')
  })

  it('Should synchronize organizations from plugins', () => {
    cy.intercept('PUT', '/api/v1/admin/organizations/sync/organizations').as('syncOrganizations')

    cy.getByDataTestid('syncOrgsBtn')
      .click()
      .wait('@syncOrganizations')

    cy.getByDataTestid('snackbar').should('contain', 'Aucune organisation à synchroniser')
  })
})
