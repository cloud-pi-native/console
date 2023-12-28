import { Pinia, createPinia, setActivePinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import TeamCt from '@/components/TeamCt.vue'
import { createRandomDbSetup, getRandomUser, toUsersStore } from '@dso-console/test-utils'
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
    const randomDbSetup = createRandomDbSetup({ nbUsers: 4 })
    const owner = randomDbSetup.project.roles.find(role => role.role === 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${randomDbSetup.project.id}/users/match?letters=*`, { body: [newUser] })

    const props = {
      userProfile: {
        ...owner,
        groups: [],
      },
      project: randomDbSetup.project,
      roles: randomDbSetup.project.roles,
      knownUsers: toUsersStore(randomDbSetup.users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', `Membres du projet ${randomDbSetup.project.name}`)
        cy.get('tbody > tr')
          .should('have.length', randomDbSetup.project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title^="retirer"]')
          .should('not.have.class', 'disabled')
      })
  })
  it('Should mount a TeamCt for admin', () => {
    useProjectStore()
    const randomDbSetup = createRandomDbSetup({ nbUsers: 4 })
    const owner = randomDbSetup.project.roles.find(role => role.role === 'owner')?.user
    const user = randomDbSetup.project.roles.find(role => role.role !== 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${randomDbSetup.project.id}/users/match?letters=*`, { body: [newUser] })

    const props = {
      userProfile: {
        ...user,
        groups: ['/admin'],
      },
      project: randomDbSetup.project,
      roles: randomDbSetup.project.roles,
      knownUsers: toUsersStore(randomDbSetup.users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', `Membres du projet ${randomDbSetup.project.name}`)
        cy.get('tbody > tr')
          .should('have.length', randomDbSetup.project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title^="retirer"]')
          .should('not.have.class', 'disabled')
      })
  })
  it('Should mount a TeamCt for user', () => {
    useProjectStore()
    const randomDbSetup = createRandomDbSetup({ nbUsers: 4 })
    const owner = randomDbSetup.project.roles.find(role => role.role === 'owner')?.user
    const user = randomDbSetup.project.roles.find(role => role.role !== 'owner')?.user
    const newUser = getRandomUser()

    cy.intercept('GET', `api/v1/projects/${randomDbSetup.project.id}/users/match?letters=*`, { body: [newUser] })

    console.log(user)

    const props = {
      userProfile: {
        ...user,
        groups: [],
      },
      project: randomDbSetup.project,
      roles: randomDbSetup.project.roles,
      knownUsers: toUsersStore(randomDbSetup.users),
    }

    cy.mount(TeamCt, { props })

    cy.getByDataTestid('teamTable').should('be.visible')
      .within(() => {
        cy.get('caption')
          .should('contain', `Membres du projet ${randomDbSetup.project.name}`)
        cy.get('tbody > tr')
          .should('have.length', randomDbSetup.project.roles?.length)
        cy.get(`td[title="${owner?.email} ne peut pas être retiré(e) du projet"]`)
          .should('have.class', 'disabled')
        cy.get('td[title="vous n\'avez pas les droits suffisants pour retirer un membre du projet"]')
          .should('have.class', 'disabled')
      })
  })
})
