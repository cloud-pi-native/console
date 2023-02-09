import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import PermissionForm from '@/components/PermissionForm.vue'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import { useProjectStore } from '@/stores/project.js'

describe('PermissionForm.vue', () => {
  it('Should mount a PermissionForm', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 3, envs: ['dev'] })
    const projectStore = useProjectStore(pinia)
    projectStore.selectedProject = randomDbSetup.project
    const environment = projectStore.selectedProject.environments[0]
    const userToLicence = getRandomUser()
    randomDbSetup.users = [userToLicence, ...randomDbSetup.users]

    const props = {
      environment,
      projectMembers: randomDbSetup.users,
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
      .should('contain', `Droits des utilisateurs sur l'environnement de ${props.environment?.name}`)
    cy.get('li')
      .should('have.length', props.environment.permissions.length)
    cy.get('li:first')
      .within(() => {
        cy.getByDataTestid('userEmail')
          .should('contain', props.environment.permissions[0].user.email)
          .get('input#range')
          .should('have.value', props.environment.permissions[0].level)
          .getByDataTestid('deletePermissionBtn')
          .should('have.attr', 'title', `Supprimer les droits de ${props.environment.permissions[0].user.email}`)
      })
    cy.getByDataTestid('newPermissionFieldset')
      .should('contain', 'Accréditer un membre du projet')
      .within(() => {
        cy.get('label')
          .should('contain', `E-mail de l'utilisateur à accréditer sur l'environnement de ${props.environment?.name}`)
        cy.get('datalist#permissionList')
          .find('option')
          .should('have.length', props.projectMembers.length - props.environment.permissions.length)
          .should('have.value', userToLicence.email)
      })
  })
})
