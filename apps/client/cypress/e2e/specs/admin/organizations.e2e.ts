import { getModel, getProjectById } from '../../support/func.js'

describe('Administration organizations', () => {
  const organizations = getModel('organization').map(({ id, label, name, active }) => ({
    id,
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
    cy.intercept('GET', 'api/v1/organizations').as('getAllOrganizations')
    cy.intercept('GET', 'api/v1/projects?filter=member&statusNotIn=archived').as('listProjects')
    cy.intercept('POST', 'api/v1/organizations').as('createOrganization')

    cy.kcLogin('tcolin')
    cy.visit('/admin/organizations')
    cy.wait('@getAllOrganizations').its('response.statusCode').should('match', /^20\d$/)
  })

  it('Should display organizations table, loggedIn as admin', () => {
    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      organizations.forEach((organization) => {
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
    cy.wait('@getAllOrganizations').its('response').then((response) => {
      cy.get('select#organizationId-select')
        .select((response.body.find(org => org.name === newOrg.name)).id)
        .should('have.value', (response.body.find(org => org.label === newOrg.label)).id)
    })
  })

  it('Should update an organization loggedIn as admin', () => {
    cy.intercept('PUT', '/api/v1/organizations/*').as('putOrganization')
    cy.intercept('GET', 'api/v1/organizations').as('getAllOrganizations')

    const newLabel = 'Ministère de la chambre rouge'

    cy.getByDataTestid('confirmUpdateOrganizationZone')
      .should('not.exist')
    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${newOrg.name}-label-input`)
        .should('have.value', newOrg.label)
        .clear()
        .type(newLabel)
        .blur()
    })
    cy.getByDataTestid('tableAdministrationOrganizations')
      .should('not.be.visible')
    cy.getByDataTestid('confirmUpdateOrganizationZone').within(() => {
      cy.getByDataTestid('updatedDataSummary')
        .should('contain', `Les données suivantes seront mises à jour pour l'organisation ${newOrg.name} : label : ${newLabel}`)
      cy.getByDataTestid('lockOrganizationAlert')
        .should('not.exist')
      cy.getByDataTestid('confirmUpdateBtn')
        .click()
    })
    cy.wait('@putOrganization')
    cy.wait('@getAllOrganizations')

    cy.getByDataTestid('snackbar').should('contain', `Organisation ${newOrg.name} mise à jour`)

    cy.getByDataTestid('confirmUpdateOrganizationZone')
      .should('not.exist')

    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${newOrg.name}-active-cbx`)
        .should('be.checked')
      cy.getByDataTestid(`${newOrg.name}-active-cbx`)
        .uncheck()
    })
    cy.getByDataTestid('tableAdministrationOrganizations')
      .should('not.be.visible')
    cy.getByDataTestid('confirmUpdateOrganizationZone').within(() => {
      cy.getByDataTestid('updatedDataSummary')
        .should('contain', `Les données suivantes seront mises à jour pour l'organisation ${newOrg.name} : active : false`)
      cy.getByDataTestid('lockOrganizationAlert')
        .should('exist')
      cy.getByDataTestid('confirmUpdateBtn')
        .click()
    })
    cy.wait('@putOrganization')
    cy.wait('@getAllOrganizations')

    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Organisation ${newOrg.name} mise à jour`)
    })

    cy.visit('/projects/create-project')
      .get(`select#organizationId-select > option[value="${organizations[0].id}"]`)
      .should('not.exist')
      .get(`select#organizationId-select > option[value="${newOrg.name}"]`)
      .should('not.exist')
  })

  it('Should deactivate and activate an organization with impact on its projects', () => {
    const projectFailed = getProjectById('83833faf-f654-40dd-bcd5-cf2e944fc702')
    const projectSucceed = getProjectById('011e7860-04d7-461f-912d-334c622d38b3')
    const organization = organizations.find(organization => organization.id === projectFailed.organizationId)

    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${organization.name}-active-cbx`)
        .should('be.checked')
        .uncheck()
    })
    cy.getByDataTestid('tableAdministrationOrganizations')
      .should('not.be.visible')
    cy.getByDataTestid('confirmUpdateOrganizationZone').within(() => {
      cy.getByDataTestid('updatedDataSummary')
        .should('contain', `Les données suivantes seront mises à jour pour l'organisation ${organization.name} : active : false`)
      cy.getByDataTestid('lockOrganizationAlert')
        .should('contain', 'Les projets associés à cette organisation seront vérrouillés, jusqu\'à la réactivation de l\'organisation.')
      cy.getByDataTestid('confirmUpdateBtn')
        .click()
    })
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Organisation ${organization.name} mise à jour`)
    })

    cy.visit('/projects')
      .wait('@listProjects')
    cy.getByDataTestid(`projectTile-${projectFailed.name}`)
      .click()
    cy.getByDataTestid(`${projectFailed.id}-locked-badge`)
      .should('exist')

    cy.visit('/projects')
      .wait('@listProjects')
    cy.getByDataTestid(`projectTile-${projectSucceed.name}`)
      .click()
    cy.getByDataTestid(`${projectSucceed.id}-locked-badge`)
      .should('exist')

    cy.visit('/admin/organizations')
      .wait('@getAllOrganizations')
    cy.getByDataTestid('tableAdministrationOrganizations').within(() => {
      cy.getByDataTestid(`${organization.name}-active-cbx`)
        .should('not.be.checked')
        .check()
    })
    cy.getByDataTestid('tableAdministrationOrganizations')
      .should('not.be.visible')
    cy.getByDataTestid('confirmUpdateOrganizationZone').within(() => {
      cy.getByDataTestid('updatedDataSummary')
        .should('contain', `Les données suivantes seront mises à jour pour l'organisation ${organization.name} : active : true`)
      cy.getByDataTestid('lockOrganizationAlert')
        .should('not.exist')
      cy.getByDataTestid('confirmUpdateBtn')
        .click()
    })
    cy.getByDataTestid('snackbar').within(() => {
      cy.get('p').should('contain', `Organisation ${organization.name} mise à jour`)
    })

    cy.visit('/projects')
    cy.getByDataTestid(`projectTile-${projectFailed.name}`)
      .click()
    cy.getByDataTestid(`${projectFailed.id}-locked-badge`)
      .should('not.exist')

    cy.visit('/projects')
    cy.getByDataTestid(`projectTile-${projectSucceed.name}`)
      .click()
    cy.getByDataTestid(`${projectSucceed.id}-locked-badge`)
      .should('not.exist')
  })

  it('Should synchronize organizations from plugins', () => {
    cy.intercept('GET', '/api/v1/organizations/sync').as('syncOrganizations')

    cy.get('legend')
      .should('contain', 'Synchroniser les organisations')
    cy.getByDataTestid('syncOrgsBtn')
      .click()
      .wait('@syncOrganizations')

    cy.getByDataTestid('snackbar').should('contain', 'Not Found')
  })
})
