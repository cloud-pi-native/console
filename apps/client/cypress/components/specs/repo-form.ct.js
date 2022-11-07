import VueDsfr from '@gouvminint/vue-dsfr'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import RepoForm from '@/components/RepoForm.vue'

describe('RepoForm.vue', () => {
  it('Should mount a RepoForm', () => {
    const props = {
      repo: {
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: true,
        externalUserName: 'clairenlet',
        externalToken: 'eddddsqsq',
      },
      isEditable: true,
    }

    const extensions = {
      use: [
        [VueDsfr, { icons: Object.values(icons) }],
      ],
    }

    cy.mount(RepoForm, { extensions, props })

    cy.get('h1').should('contain', 'Ajouter un dépôt au projet')
      .getByDataTestid('repoFieldset').should('have.length', 1)
      .getByDataTestid('internalRepoNameInput').should('have.value', props.repo.internalRepoName)
      .getByDataTestid('externalRepoUrlInput').should('have.value', props.repo.externalRepoUrl)
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').should('be.checked')
      .getByDataTestid('externalUserNameInput').should('have.value', props.repo.externalUserName)
      .getByDataTestid('externalTokenInput').should('have.value', props.repo.externalToken)
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('cancelRepoBtn').should('be.enabled')
      .getByDataTestid('privateRepoCbx').find('input[type="checkbox"]').uncheck({ force: true })
      .getByDataTestid('externalUserNameInput').should('not.exist')
      .getByDataTestid('externalTokenInput').should('not.exist')
      .getByDataTestid('addRepoBtn').should('be.enabled')
      .getByDataTestid('cancelRepoBtn').should('be.enabled')
  })
})
