import type { Pinia } from 'pinia'
import { createPinia, setActivePinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import type { ProjectV2 } from '@cpn-console/shared'
import { faker } from '@faker-js/faker'
import TeamCt from '@/components/TeamCt.vue'
import { useProjectStore } from '@/stores/project.js'
import { useUsersStore } from '@/stores/users.js'
import { useUserStore } from '@/stores/user.js'

const ownerId = faker.string.uuid()
const props: {
  project: ProjectV2
  canManage: boolean
  canTransfer: boolean
} = {
  project: {
    members: [{
      userId: faker.string.uuid(),
      roleIds: [],
      email: faker.internet.email(),
    }],
    owner: {
      email: faker.internet.email(),
      id: ownerId,
    },
    ownerId,
    roles: [],
  },
  canManage: true,
  canTransfer: true,
}

describe('TeamCt.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a TeamCt for owner', () => {
    useProjectStore()
    useUsersStore()

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', props.project.members.length + 1) // +1 cause owner is not a member
        cy.get('thead > tr > th')
          .should('have.length', 4)
      })
    cy.getByDataTestid('showTransferProjectBtn')
      .should('be.enabled')
      .should('be.visible')
    cy.getByDataTestid('addUserSuggestionInput')
      .should('be.enabled')
      .should('be.visible')
  })
  it('Should mount a TeamCt for manage', () => {
    useProjectStore()
    cy.mount(TeamCt, { props: { ...props, canTransfer: false } })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', props.project.members.length + 1) // +1 cause owner is not a member
        cy.get('thead > tr > th')
          .should('have.length', 4)
      })
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('addUserSuggestionInput')
      .should('be.enabled')
      .should('be.visible')
  })
  it('Should mount a TeamCt for user', () => {
    useProjectStore()
    const userStore = useUserStore()
    // devrait tester que l'on peut toujours quitter un projet
    userStore.userProfile = { id: props.project.members[0].id }

    cy.mount(TeamCt, { props: { ...props, canTransfer: false, canManage: false } })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', props.project.members.length + 1) // +1 cause owner is not a member
        cy.get('thead > tr > th')
          .should('have.length', 4)
      })
    cy.getByDataTestid('showTransferProjectBtn')
      .should('not.exist')
    cy.getByDataTestid('addUserSuggestionInput')
      .should('not.exist')
  })
})
