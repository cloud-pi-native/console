import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import ServicesConfig from '@/components/ServicesConfig.vue'
import { useProjectStore } from '@/stores/project'
import { Project } from '@/utils/project-utils'
import { faker } from '@faker-js/faker'
import type { Pinia } from 'pinia'
import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from '@/stores/user'

process.env.NODE_ENV = 'test'
process.env.CT = 'true'

const argoto = { to: 'https://argocd.domain.com/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=org-project', name: '' }
const gitlabto = { to: 'https://gitlab.domain.com/forge-mi/projects/org/project', name: '' }
const services = [
  { imgSrc: '/img/argocd.svg', title: 'ArgoCD', name: 'argocd', urls: [argoto, argoto, argoto], manifest: {} },
  { imgSrc: '/img/gitlab.svg', title: 'Gitlab', name: 'gitlab', urls: [gitlabto, gitlabto], manifest: {} },
  { imgSrc: '/img/harbor.svg', title: 'Harbor', name: 'registry', urls: [{ to: 'https://harbor.domain.com/harbor/projects/254', name: '' }], manifest: { global: [{ permissions: { admin: { read: true, write: true }, user: { read: true, write: false } }, key: 'publish-ro-robot-by-default', kind: 'switch', title: 'Publier le robot RO par défaut', value: 'default', initialValue: 'disabled' }], project: [{ permissions: { admin: { read: true, write: true }, user: { read: true, write: false } }, key: 'view-robot', kind: 'switch', title: 'Publier le robot', initialValue: 'disabled', value: 'default', description: 'Autoriser un robot de lecture sur le projet' }] } },
  { imgSrc: '/img/sonarqube.svg', title: 'SonarQube', name: 'sonarqube', urls: [], manifest: {} },
]

const urlsLength = services.reduce((length, service) => length + service.urls.length, 0)

const project = {
  clusterIds: [],
  createdAt: Date.now().toString(),
  updatedAt: Date.now().toString(),
  everyonePerms: '0',
  id: faker.string.uuid(),
  lastSuccessProvisionningVersion: null,
  locked: false,
  members: [],
  name: 'projet-test',
  owner: {
    createdAt: Date.now().toString(),
    updatedAt: Date.now().toString(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    id: faker.string.uuid(),
    type: 'human' as const,
    lastLogin: null,
  },
  ownerId: faker.string.uuid(),
  roles: [],
  slug: faker.string.alphanumeric(10),
  status: 'created' as const,
}

describe('Service Configuration Component', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })
  it('Affiche correctement les services et leurs configurations', () => {
    const projectStore = useProjectStore()
    projectStore.projectsBySlug[project.slug] = project

    useUserStore()
    const instanceProject = new Project(project)
    cy.intercept('GET', 'api/v1/projects/*/services*', {
      body: services,
    }).as('listServices')
    cy.mount(ServicesConfig, {
      propsData: {
        project: instanceProject,
        permissionTarget: 'user',
        displayGlobal: true,
      },
    })

    // Vérifie que les services sont correctement affichés
    cy.getByDataTestid('services-urls').find('a').should('have.length', urlsLength)

    cy.getByDataTestid('service-config-registry').should('exist')

    // Vérifie que les boutons de lien sont présents et fonctionnent
    cy.getByDataTestid('service-config-registry').click() // Simule un clic sur le premier lien

    // Vérifie que les boutons de rechargement sont présents
    cy.getByDataTestid('reloadBtn').should('exist')
  })

  it('Interagit correctement avec le bouton de dropdown', () => {
    useProjectStore()
    useUserStore()
    const instanceProject = new Project(project)
    cy.intercept('GET', 'api/v1/projects/*/services*', {
      body: services,
    }).as('listServices')

    cy.mount(ServicesConfig, {
      propsData: {
        project: instanceProject,
        permissionTarget: 'user',
        displayGlobal: true,
      },
    })
    // Simule un clic sur le bouton d'extension
    cy.getByDataTestid('service-config-registry')
      .click()
    cy.getByDataTestid('service-project-config-registry')
      .should('exist')
    cy.getByDataTestid('service-project-config-registry')
      .should('exist')
  })
})
