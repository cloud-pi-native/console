import { type Pinia, createPinia, setActivePinia } from 'pinia'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import { fakeToken, missingCredentials } from '@cpn-console/shared'

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

  it('Should mount a new repo RepoForm', () => {
    const props = {
      canManage: true,
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.get('h2').should('contain', 'Ajouter un dépôt au projet')
    cy.getByDataTestid('repoFieldset').should('have.length', 1)
    // Case 1 : no Git source
    cy.getByDataTestid('internalRepoNameInput')
      .should('have.value', '')
      .type('candilib')
    cy.getByDataTestid('standaloneRepoSwitch')
      .find('input')
      .check({ force: true })
    cy.getByDataTestid('externalRepoUrlInput').should('not.exist')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').should('not.exist')
    cy.getByDataTestid('externalUserNameInput').should('not.exist')
    cy.getByDataTestid('externalTokenInput').should('not.exist')
    cy.getByDataTestid('input-checkbox-infraRepoCbx')
      .should('not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    // Case 2 : no Git source, infra
    cy.getByDataTestid('input-checkbox-infraRepoCbx').check({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    // Case 3 : Git source
    cy.getByDataTestid('standaloneRepoSwitch')
      .find('input')
      .uncheck({ force: true })
    cy.getByDataTestid('externalRepoUrlInput')
      .type('https://github.com/LAB-MI/candilibV2.git')
      .blur()
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    // Case 4 : Git source, private
    cy.getByDataTestid('input-checkbox-privateRepoCbx')
      .should('exist')
      .and('be.enabled')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('externalUserNameInput').should('exist')
    cy.getByDataTestid('externalTokenInput').should('exist')
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalUserNameInput').type('claire+nlet')
    cy.getByDataTestid('externalTokenInput')
      .type('aaaaaa')
      .blur()
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
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
        externalUserName: 'claire+nlet',
      },
      canManage: true,
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.get('h2').should('contain', 'Modifier le dépôt')
    cy.getByDataTestid('repoFieldset').should('have.length', 1)
    cy.getByDataTestid('internalRepoNameInput').should('have.value', props.repo.internalRepoName)
      .and('be.disabled')
    cy.getByDataTestid('externalRepoUrlInput').should('have.value', props.repo.externalRepoUrl)
      .and('be.enabled')
    cy.getByDataTestid('input-checkbox-privateRepoCbx').should('be.checked')
      .and('be.enabled')
    cy.getByDataTestid('externalUserNameInput').should('have.value', props.repo.externalUserName)
      .and('be.enabled')
    cy.getByDataTestid('externalTokenInput').should('have.value', fakeToken)
      .and('be.enabled')
    cy.getByDataTestid('input-checkbox-infraRepoCbx').should('not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('standaloneRepoSwitch')
      .find('input')
      .should('not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput')
      .clear()
      .type('aaaaaaa')
      .blur()
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')

    // Case 1 privacy handling
    cy.getByDataTestid('input-checkbox-privateRepoCbx')
      .uncheck({ force: true })
    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('externalUserNameInput')
      .should('exist')
      .and('have.value', '')
    cy.getByDataTestid('externalTokenInput')
      .should('exist')
      .and('have.value', '')
    cy.getByDataTestid('updateRepoBtn').should('be.disabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalUserNameInput').type(props.repo.externalUserName)
    cy.getByDataTestid('externalTokenInput')
      .type('aaaaaa')
      .blur()
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')

    // Case 2 : no Git source
    cy.getByDataTestid('externalRepoUrlInput')
      .clear()
      .should('have.value', '')
      .blur()
    cy.getByDataTestid('standaloneRepoSwitch')
      .find('input')
      .check({ force: true })
    cy.getByDataTestid('input-checkbox-privateRepoCbx')
      .should('not.exist')
    cy.getByDataTestid('externalUserNameInput').should('not.exist')
    cy.getByDataTestid('externalTokenInput').should('not.exist')
    cy.getByDataTestid('input-checkbox-infraRepoCbx')
      .should('not.be.checked')
      .and('be.enabled')
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')

    // Case 3 : no Git source, infra
    cy.getByDataTestid('input-checkbox-infraRepoCbx').check({ force: true })
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')

    // Case 4 : Git source
    cy.getByDataTestid('standaloneRepoSwitch')
      .find('input')
      .uncheck({ force: true })
    cy.getByDataTestid('externalRepoUrlInput')
      .type(props.repo.externalRepoUrl)
      .blur()
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('cancelRepoBtn').should('be.enabled')
  })

  it('Should handle token behaviors, create', () => {
    const props = {
      canManage: true,
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.getByDataTestid('repoFieldset').should('have.length', 1)
    cy.getByDataTestid('internalRepoNameInput')
      .should('have.value', '')
      .type('candilib')

    cy.getByDataTestid('externalRepoUrlInput')
      .type('https://github.com/LAB-MI/candilibV2.git')
      .blur()
    cy.getByDataTestid('addRepoBtn').should('be.enabled')

    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalUserNameInput').should('exist')
    cy.getByDataTestid('externalTokenInput')
      .type('aaaaaa')
      .blur()
    cy.getByDataTestid('repo-form').should('not.contain', missingCredentials)
    cy.getByDataTestid('addRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput')
      .clear()
      .blur()
    cy.getByDataTestid('repo-form').should('contain', missingCredentials)
    cy.getByDataTestid('addRepoBtn').should('be.disabled')
  })

  it('Should handle token behaviors, update public', () => {
    const props = {
      repo: {
        id: '83833faf-f654-40dd-bcd5-cf2e944fc504',
        projectId: '83833faf-f654-40dd-bcd5-cf2e944fc500',
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: false,
        isInfra: false,
        externalUserName: 'claire+nlet',
      },
      canManage: true,
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.getByDataTestid('repoFieldset').should('have.length', 1)

    cy.getByDataTestid('updateRepoBtn').should('be.enabled')

    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('updateRepoBtn').should('be.disabled')
    cy.getByDataTestid('externalUserNameInput').should('exist')
    cy.getByDataTestid('externalTokenInput')
      .type('aaaaaa')
      .blur()
    cy.getByDataTestid('repo-form').should('not.contain', missingCredentials)
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalTokenInput')
      .clear()
      .blur()
    cy.getByDataTestid('repo-form').should('contain', missingCredentials)
    cy.getByDataTestid('updateRepoBtn').should('be.disabled')
  })

  it('Should handle token behaviors, update private', () => {
    const props = {
      repo: {
        id: '83833faf-f654-40dd-bcd5-cf2e944fc504',
        projectId: '83833faf-f654-40dd-bcd5-cf2e944fc500',
        internalRepoName: 'candilib',
        externalRepoUrl: 'https://github.com/LAB-MI/candilibV2.git',
        isPrivate: true,
        isInfra: false,
        externalUserName: 'claire+nlet',
      },
      canManage: true,
    }

    const randomDbSetup = createRandomDbSetup({})
    const projectStore = useProjectStore()
    projectStore.selectedProject = randomDbSetup.project

    cy.mount(RepoForm, { props })

    cy.getByDataTestid('repoFieldset').should('have.length', 1)

    cy.getByDataTestid('updateRepoBtn').should('be.enabled')

    cy.getByDataTestid('input-checkbox-privateRepoCbx').check({ force: true })
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('externalUserNameInput').should('exist')
    cy.getByDataTestid('externalTokenInput')
      .type('a')
      .blur()
    cy.getByDataTestid('warningSecretChanged')
      .should('be.visible')
    cy.getByDataTestid('repo-form').should('not.contain', missingCredentials)
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    cy.getByDataTestid('resetTokenButton')
      .click()
    cy.getByDataTestid('warningSecretChanged')
      .should('not.exist')
    cy.getByDataTestid('repo-form').should('not.contain', missingCredentials)
    cy.getByDataTestid('updateRepoBtn').should('be.enabled')
    // missing creds
    cy.getByDataTestid('externalTokenInput')
      .clear()
      .blur()
    cy.getByDataTestid('externalUserNameInput')
      .clear()
      .blur()
    cy.getByDataTestid('repo-form').should('contain', missingCredentials)
    cy.getByDataTestid('updateRepoBtn').should('be.disabled')
  })
})
