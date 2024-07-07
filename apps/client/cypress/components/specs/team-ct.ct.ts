import { Pinia, createPinia, setActivePinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import TeamCt from '@/components/TeamCt.vue'
import { createRandomDbSetup, getRandomUser, toUsersStore } from '@cpn-console/test-utils'
import { useProjectStore } from '@/stores/project.js'
import { useUsersStore } from '@/stores/users.js'

describe('TeamCt.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it('Should mount a TeamCt for owner', () => {
    useProjectStore()
    useUsersStore()
    const { project, users } = createRandomDbSetup({ nbUsers: 4 })
    const owner = project.roles.find(role => role.role === 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${project.id}/users/match?letters=*`, { body: [newUser] })

    const props = {
      userProfile: {
        ...owner,
        groups: [],
      },
      project,
      members: project.roles,
      knownUsers: toUsersStore(users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title^="retirer"]')
          .should('not.have.class', 'disabled')
      })
  })
  it('Should mount a TeamCt for admin', () => {
    useProjectStore()
    const { project, users } = createRandomDbSetup({ nbUsers: 4 })
    const owner = project.roles.find(role => role.role === 'owner')?.user
    const user = project.roles.find(role => role.role !== 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${project.id}/users/match?letters=*`, { body: [newUser] })

    const props = {
      userProfile: {
        ...user,
        groups: ['/admin'],
      },
      project,
      members: project.roles,
      knownUsers: toUsersStore(users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title^="retirer"]')
          .should('not.have.class', 'disabled')
      })
  })
  it('Should mount a TeamCt for user', () => {
    useProjectStore()
    const { project, users } = createRandomDbSetup({ nbUsers: 4 })
    const owner = project.roles.find(role => role.role === 'owner')?.user
    const user = project.roles.find(role => role.role !== 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${project.id}/users/match?letters=*`, { body: [newUser] })

    const props = {
      userProfile: {
        ...user,
        groups: [],
      },
      project,
      members: project.roles,
      knownUsers: toUsersStore(users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', 'Membres du projet')
        cy.get('tbody > tr')
          .should('have.length', project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title="vous n\'avez pas les droits suffisants pour retirer un membre du projet"]')
          .should('have.class', 'disabled')
      })
  })
})
