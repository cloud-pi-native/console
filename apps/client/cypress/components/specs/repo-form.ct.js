import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import * as icons from '@/icons.js'
import RepoForm from '@/components/RepoForm.vue'
import { createRandomDbSetup } from 'test-utils'
import { useProjectStore } from '@/stores/project.js'
import { allOrganizations } from 'shared/src/utils/iterables.js'

describe('RepoForm.vue', () => {
  it('Should mount a RepoForm', () => {
    cy.intercept('POST', '/api/v1/ci-files', { 'gitlab-ci-dso': 'my generated file' })
    cy.intercept('GET', '/api/v1/organizations', allOrganizations)
    const pinia = createPinia()

    const props = {
      repo: {
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: true,
        isInfra: false,
        externalUserName: 'clairenlet',
        externalToken: 'eddddsqsq',
      },
      isEditable: true,

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

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore(pinia)
    projectStore.selectedProject = randomDbSetup

    cy.mount(RepoForm, { extensions, props })

    cy.get('h1').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('repoFieldset').should('have.length', 1)
      .get('select#type-language-select').should('not.be.visible')
      .getByDataTestid('internalRepoNameInput').should('have.value', props.repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').should('have.value', props.repo.externalRepoUrl)
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').should('be.checked')
      .getByDataTestid('externalUserNameInput').should('have.value', props.repo.externalUserName)
      .getByDataTestid('externalTokenInput').should('have.value', props.repo.externalToken)
      .getByDataTestid('infraRepoCbx').find('input[type="checkbox"]').should('not.be.checked')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('cancelRepoBtn').should('be.enabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').uncheck({ force: true })
      .getByDataTestid('externalUserNameInput').should('not.exist')
      .getByDataTestid('externalTokenInput').should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('cancelRepoBtn').should('be.enabled')
      .getByDataTestid('gitlabCIAccordion').click()
      .get('select#type-language-select').should('be.visible')
      .select('node')
      .getByDataTestid('nodeVersionInput').type('18.1.1')
      .getByDataTestid('nodeInstallInput').type('npm install')
      .getByDataTestid('nodeBuildInput').type('npm build')
      .getByDataTestid('workingDirInput').type('./')
      .getByDataTestid('generateCIBtn').click()
      .getByDataTestid('generatedCI').should('be.visible')
      .getByDataTestid('copy-gitlab-ci-dso-ContentBtn').click()
      .window().then((win) => {
        win.navigator.clipboard.readText().then((text) => {
          expect(text).to.eq('my generated file')
        })
      })
    cy.get('.fr-download__link').first()
      .find('span').should(($span) => {
        const text = $span.text()
        expect(text).to.match(/YAML – \d* bytes/)
      })
  })
})
