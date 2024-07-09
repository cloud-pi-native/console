import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import PermissionForm from '@/components/PermissionForm.vue'
import { createRandomDbSetup, getRandomUser, getRandomRole } from '@cpn-console/test-utils'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import { Pinia, createPinia, setActivePinia } from 'pinia'
import { useUsersStore } from '@/stores/users.js'

describe('PermissionForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a PermissionForm with users to licence', () => {
    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore()
    const userStore = useUserStore()
    const usersStore = useUsersStore()

    let userToLicence = getRandomUser()
    userToLicence = {
      ...getRandomRole(userToLicence.id),
      user: userToLicence,
    }
    usersStore.users = randomDbSetup.users.reduce((acc, curr) => {
      return { ...acc, [curr.id]: curr }
    }, {})
    usersStore.users[userToLicence.userId] = userToLicence.user

    projectStore.selectedProject = randomDbSetup.project
    const owner = randomDbSetup.project.roles?.find(role => role.role === 'owner')?.user
    userStore.userProfile = randomDbSetup.users[1]
    projectStore.selectedProject.roles = [userToLicence, ...randomDbSetup.project.roles]

    const environment = projectStore.selectedProject?.environments[0]
    const ownerPermission = environment.permissions.find(permission => permission.user.email === owner.email)
    const userPermission = environment.permissions.find(permission => permission.user.email !== owner.email)

    const props = {
      environment,
    }

    cy.mount(PermissionForm, { props })

    cy.getByDataTestid('permissionsFieldset')
      .should('contain', `Droits des utilisateurs sur l'environnement ${props.environment.name}`)
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
          .get('[data-testid$=UpsertPermissionBtn]')
          .should('be.disabled')
          .and('have.attr', 'title', 'Les droits du owner ne peuvent être inférieurs à rwd')
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
          .get('[data-testid$=UpsertPermissionBtn]')
          .should('have.attr', 'title', `Modifier les droits de ${userPermission.user.email}`)
      })
    cy.getByDataTestid('newPermissionFieldset')
      .should('contain', 'Accréditer un membre du projet')
      .within(() => {
        cy.get('label')
          .should('contain', `E-mail de l'utilisateur à accréditer sur l'environnement ${props.environment.name}`)
        cy.get('.fr-hint-text')
          .should('contain', `Entrez l'e-mail d'un membre du projet ${projectStore.selectedProject.name}. Ex : ${userToLicence.user.email}`)
        cy.get('datalist#suggestionList')
          .find('option')
          .should('have.length', projectStore.selectedProject.roles.length - props.environment.permissions.length)
          .should('have.value', userToLicence.user.email)
      })
  })
  it('Should mount a PermissionForm with no user to licence', () => {
    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore()
    const userStore = useUserStore()
    const usersStore = useUsersStore()

    usersStore.users = randomDbSetup.users.reduce((acc, curr) => {
      return { ...acc, [curr.id]: curr }
    }, {})
    projectStore.selectedProject = randomDbSetup.project
    userStore.userProfile = randomDbSetup.users[1]

    const environment = projectStore.selectedProject?.environments[0]

    const props = {
      environment,
    }

    cy.mount(PermissionForm, { props })

    cy.getByDataTestid('newPermissionFieldset')
      .should('contain', 'Accréditer un membre du projet')
      .within(() => {
        cy.get('label')
          .should('contain', `E-mail de l'utilisateur à accréditer sur l'environnement ${props.environment.name}`)
        cy.get('.fr-hint-text')
          .should('contain', `Tous les membres du projet ${projectStore.selectedProject.name} sont déjà accrédités.`)
      })
  })

  it('Should mount a PermissionForm without permission for current user', () => {
    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore()
    const userStore = useUserStore()
    const usersStore = useUsersStore()

    usersStore.users = randomDbSetup.users.reduce((acc, curr) => {
      return { ...acc, [curr.id]: curr }
    }, {})

    projectStore.selectedProject = randomDbSetup.project
    userStore.userProfile = getRandomUser()

    const environment = projectStore.selectedProject?.environments[0]

    const props = {
      environment,
    }

    cy.mount(PermissionForm, { props })

    cy.getByDataTestid('notPermittedAlert')
      .should('contain', `Vous n'avez aucun droit sur l'environnement ${props.environment.name}. Un membre possédant des droits sur cet environnement peut vous accréditer.`)
  })
})
