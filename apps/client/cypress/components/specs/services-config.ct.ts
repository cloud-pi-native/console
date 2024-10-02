import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import ServicesConfig from '@/components/ServicesConfig.vue'

const argoto = { to: 'https://argocd.domain.com/applications?showFavorites=false&proj=&sync=&health=&namespace=&cluster=&labels=&search=org-project', name: '' }
const gitlabto = { to: 'https://gitlab.domain.com/forge-mi/projects/org/project', name: '' }
const services = [
  { imgSrc: '/img/argocd.svg', title: 'ArgoCD', name: 'argocd', urls: [argoto, argoto, argoto], manifest: {} },
  { imgSrc: '/img/gitlab.svg', title: 'Gitlab', name: 'gitlab', urls: [gitlabto, gitlabto], manifest: {} },
  { imgSrc: '/img/harbor.svg', title: 'Harbor', name: 'registry', urls: [{ to: 'https://harbor.domain.com/harbor/projects/254', name: '' }], manifest: { global: [{ permissions: { admin: { read: true, write: true }, user: { read: true, write: false } }, key: 'publish-ro-robot-by-default', kind: 'switch', title: 'Publier le robot RO par défaut', value: 'default', initialValue: 'disabled' }], project: [{ permissions: { admin: { read: true, write: true }, user: { read: true, write: false } }, key: 'view-robot', kind: 'switch', title: 'Publier le robot', initialValue: 'disabled', value: 'default', description: 'Autoriser un robot de lecture sur le projet' }] } },
  { imgSrc: '/img/sonarqube.svg', title: 'SonarQube', name: 'sonarqube', urls: [], manifest: {} },
]

const urlsLength = services.reduce((length, service) => length + service.urls.length, 0)

describe('Service Configuration Component', () => {
  it('Affiche correctement les services et leurs configurations', () => {
    cy.mount(ServicesConfig, {
      propsData: {
        services,
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
    cy.mount(ServicesConfig, {
      propsData: {
        services,
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
