import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import PermissionForm from '@/components/PermissionForm.vue'
import { createRandomDbSetup } from 'test-utils'
import { useProjectStore } from '@/stores/project.js'

describe('PermissionForm.vue', () => {
  it('Should mount a PermissionForm', () => {
    const pinia = createPinia()

    const randomDbSetup = createRandomDbSetup({ nbUsers: 2, envs: ['dev'] })
    const projectStore = useProjectStore(pinia)
    projectStore.selectedProject = randomDbSetup

    const environment = randomDbSetup.environments[0]
    environment.permissions = [
      ...randomDbSetup.permissions[0],
      ...randomDbSetup.permissions[1],
    ]
    environment.permissions[0].user = randomDbSetup.owner
    environment.permissions[1].user = randomDbSetup.users[0]

    const props = {
      environment,
      projectMembers: [...randomDbSetup.users, randomDbSetup.owner],
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
        // TODO
          // .should('have.length', props.projectMembers.length - props.environment.permissions.length)
      })
  })
})
