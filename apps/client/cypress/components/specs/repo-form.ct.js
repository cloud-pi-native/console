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
  })
})
