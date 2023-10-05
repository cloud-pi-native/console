import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import * as icons from '@/icons.js'
import PermissionForm from '@/components/PermissionForm.vue'
import { createRandomDbSetup, getRandomUser, getRandomRole } from '@dso-console/test-utils'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'

describe('PermissionForm.vue', () => {
  it('Should mount a PermissionForm with users to licence', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore(pinia)
    const userStore = useUserStore(pinia)

    projectStore.selectedProject = randomDbSetup.project
    projectStore.selectedProjectOwner = randomDbSetup.users[0]
    userStore.userProfile = randomDbSetup.users[1]

    const userToLicence = {
      ...getRandomRole(),
      user: getRandomUser(),
    }
    projectStore.selectedProject.roles = [userToLicence, ...randomDbSetup.project.roles]

    const environment = projectStore.selectedProject?.environments[0]
    const ownerPermission = environment.permissions.find(permission => permission.user.email === projectStore.selectedProjectOwner.email)
    const userPermission = environment.permissions.find(permission => permission.user.email !== projectStore.selectedProjectOwner.email)

    const props = {
      environment,
      environmentName: randomDbSetup.dsoEnvironments.find(dsoEnvironment => dsoEnvironment.id === environment.dsoEnvironmentId).name,
    }

    const extensions = {
      use: [
        [
          VueDsfr, { icons: Object.values(icons) },
        ],
      ],
      global: {
        plugins: [pinia],
      },
    }

    cy.mount(PermissionForm, { extensions, props })

    cy.getByDataTestid('permissionsFieldset')
      .should('contain', `Droits des utilisateurs sur l'environnement de ${props.environmentName}`)
    cy.get('li')
      .should('have.length', props.environment.permissions.length)

    cy.getByDataTestid(`userPermissionLi-${ownerPermission.user.email}`)
      .within(() => {
        cy.getByDataTestid('userEmail')
          .should('contain', ownerPermission.user.email)
          .get('input#range')
          .should('have.value', ownerPermission.level)
          .and('be.disabled')
          .getByDataTestid('deletePermissionBtn')
          .should('have.attr', 'title', 'Les droits du owner ne peuvent être supprimés')
          .and('be.disabled')
          .get('[data-testid$=UpdatePermissionBtn]')
          .should('be.disabled')
          .and('have.attr', 'title', 'Les droits du owner ne peuvent être modifiés')
      })

    cy.getByDataTestid(`userPermissionLi-${userPermission.user.email}`)
      .within(() => {
        cy.getByDataTestid('userEmail')
          .should('contain', userPermission.user.email)
          .get('input#range')
          .should('have.value', userPermission.level)
          .and('be.enabled')
          .getByDataTestid('deletePermissionBtn')
          .should('have.attr', 'title', `Supprimer les droits de ${userPermission.user.email}`)
          .and('be.enabled')
          .get('[data-testid$=UpdatePermissionBtn]')
          .should('have.attr', 'title', `Modifier les droits de ${userPermission.user.email}`)
      })
    cy.getByDataTestid('newPermissionFieldset')
      .should('contain', 'Accréditer un membre du projet')
      .within(() => {
        cy.get('label')
          .should('contain', `E-mail de l'utilisateur à accréditer sur l'environnement de ${props.environmentName}`)
        cy.get('.fr-hint-text')
          .should('contain', `Entrez l'e-mail d'un membre du projet ${projectStore.selectedProject.name}. Ex : ${userToLicence.user.email}`)
        cy.get('datalist#suggestionList')
          .find('option')
          .should('have.length', projectStore.selectedProject.roles.length - props.environment.permissions.length)
          .should('have.value', userToLicence.user.email)
      })
  })
  it('Should mount a PermissionForm with no user to licence', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore(pinia)
    const userStore = useUserStore(pinia)

    projectStore.selectedProject = randomDbSetup.project
    projectStore.selectedProjectOwner = randomDbSetup.users[0]
    userStore.userProfile = randomDbSetup.users[1]

    const environment = projectStore.selectedProject?.environments[0]

    const props = {
      environment,
      environmentName: randomDbSetup.dsoEnvironments.find(dsoEnvironment => dsoEnvironment.id === environment.dsoEnvironmentId).name,
    }

    const extensions = {
      use: [
        [
          VueDsfr, { icons: Object.values(icons) },
        ],
      ],
      global: {
        plugins: [pinia],
      },
    }

    cy.mount(PermissionForm, { extensions, props })

    cy.getByDataTestid('newPermissionFieldset')
      .should('contain', 'Accréditer un membre du projet')
      .within(() => {
        cy.get('label')
          .should('contain', `E-mail de l'utilisateur à accréditer sur l'environnement de ${props.environmentName}`)
        cy.get('.fr-hint-text')
          .should('contain', `Tous les membres du projet ${projectStore.selectedProject.name} sont déjà accrédités.`)
      })
  })
  it('Should mount a PermissionForm without permission for current user', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore(pinia)
    const userStore = useUserStore(pinia)

    projectStore.selectedProject = randomDbSetup.project
    projectStore.selectedProjectOwner = randomDbSetup.users[0]
    userStore.userProfile = getRandomUser()

    const environment = projectStore.selectedProject?.environments[0]

    const props = {
      environment,
      environmentName: randomDbSetup.dsoEnvironments.find(dsoEnvironment => dsoEnvironment.id === environment.dsoEnvironmentId).name,
    }

    const extensions = {
      use: [
        [
          VueDsfr, { icons: Object.values(icons) },
        ],
      ],
      global: {
        plugins: [pinia],
      },
    }

    cy.mount(PermissionForm, { extensions, props })

    cy.getByDataTestid('notPermittedAlert')
      .should('contain', `Vous n'avez aucun droit sur l'environnement de ${props.environmentName}. Un membre possédant des droits sur cet environnement peut vous accréditer.`)
  })
})
