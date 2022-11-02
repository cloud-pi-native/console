import RepoForm from '../../../../apps/client/src/components/RepoForm.vue'

describe('RepoForm.vue', () => {
  it('Should mount a RepoForm', () => {
    const props = {
      repo: {
        gitName: 'candilib',
        gitSourceName: 'https://candilib.com',
        gitToken: 'eddddsqsq',
        isPrivate: true,
        userName: 'clairenlet',
      },
      isEditable: true,
    }

    cy.mount(RepoForm, { props })

    cy.get('h1').should('contain', 'Ajouter un dépôt au projet')
  })
})
