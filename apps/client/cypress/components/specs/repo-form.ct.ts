import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import { allOrganizations } from '@cpn-console/shared'

import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'

import RepoForm from '@/components/RepoForm.vue'
import { useProjectStore } from '@/stores/project.js'

describe('RepoForm.vue', () => {
  let pinia: Pinia

  beforeEach(() => {
    pinia = createPinia()

    setActivePinia(pinia)
  })

  it.skip('Should mount a new repo RepoForm', { browser: '!firefox' }, () => {
    cy.intercept('GET', '/api/v1/organizations', allOrganizations)
    cy.intercept('POST', '/api/v1/ci-files', {
      statusCode: 201,
      body: {
        content: {
          'gitlab-ci-dso': 'gitlab-ci file',
          node: 'node file',
          vault: 'vault file',
          rules: 'rules file',
          docker: 'docker file',
        },
      },
    })

    const props = {
      repo: {
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: true,
        isInfra: false,
        externalUserName: 'clairenlet',
        externalToken: 'eddddsqsq',
      },
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.get('h1').should('contain', 'Ajouter un dépôt au projet')
    cy.getByDataTestid('repoFieldset').should('have.length', 1)
    cy.get('select#type-language-select').should('not.be.visible')
    cy.getByDataTestid('internalRepoNameInput').find('input').should('have.value', props.repo.internalRepoName)
    cy.getByDataTestid('externalRepoUrlInput').find('input').should('have.value', props.repo.externalRepoUrl)
    cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').should('be.checked')
    cy.getByDataTestid('externalUserNameInput').find('input').should('have.value', props.repo.externalUserName)
    cy.getByDataTestid('externalTokenInput').find('input').should('have.value', props.repo.externalToken)
    cy.getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').should('not.be.checked')
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').uncheck({ force: true })
    cy.getByDataTestid('externalUserNameInput').should('not.exist')
    cy.getByDataTestid('externalTokenInput').should('not.exist')
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('gitlabCIAccordion').click()
    cy.get('select#type-language-select').should('be.visible')
      .select('node')
    cy.getByDataTestid('nodeVersionInput').type('20.11.0')
    cy.getByDataTestid('nodeInstallInput').type('npm install')
    cy.getByDataTestid('nodeBuildInput').type('npm build')
    cy.getByDataTestid('workingDirInput').type('./')
    cy.getByDataTestid('generateCIBtn').click()
    cy.getByDataTestid('generatedCI').should('be.visible')
    cy.getByDataTestid('zip-download-link').should('contain', 'Télécharger tous les fichiers')
    cy.getByDataTestid('copy-gitlab-ci-dso-ContentBtn').click()
      .window().then((win) => {
        win.navigator.clipboard.readText().then((text) => {
          expect(text).to.eq('gitlab-ci file')
        })
      })
    cy.get('.fr-link--download').first()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/zip – \d* bytes/)
      })
    cy.get('.fr-link--download').last()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/YAML – \d* bytes/)
      })
  })

  it('Should mount an update repo RepoForm', () => {
    const props = {
      repo: {
        id: '83833faf-f654-40dd-bcd5-cf2e944fc504',
        projectId: '83833faf-f654-40dd-bcd5-cf2e944fc500',
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: true,
        isInfra: false,
        externalUserName: 'clairenlet',
      },
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.get('h1').should('contain', 'Modifier le dépôt')
    cy.getByDataTestid('repoFieldset').should('have.length', 1)
    cy.getByDataTestid('internalRepoNameInput').find('input').should('have.value', props.repo.internalRepoName)
      .and('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').find('input').should('have.value', props.repo.externalRepoUrl)
      .and('be.enabled')
    cy.getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').should('be.checked')
      .and('be.enabled')
    cy.getByDataTestid('externalUserNameInput').find('input').should('have.value', props.repo.externalUserName)
      .and('be.enabled')
    cy.getByDataTestid('externalTokenInput').find('input').should('have.value', '')
      .and('be.enabled')
    cy.getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').should('not.be.checked')
      .and('be.disabled')
    cy.getByDataTestid('updateRepoBtn').should('be.disabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput').find('input').type('aaaaaaa').blur()
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
  })
})
