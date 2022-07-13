import { mount } from '@cypress/vue'

import '@gouvminint/vue-dsfr/styles'

import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { RiRefreshLine, RiSearchLine, RiCloseLine } from 'oh-vue-icons/icons/ri/index.js'

import { DsfrButton } from '@gouvminint/vue-dsfr'

import ReloadPrompt from './ReloadPrompt.vue'

addIcons(RiRefreshLine, RiSearchLine, RiCloseLine)

describe('ReloadPrompt', () => {
  it('should render ReloadPrompt with offline ready button', () => {
    mount(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon: OhVueIcon,
        },
      },
      props: {
        offlineReady: true,
      },
    })

    cy.get('button')
      .should('contain', 'Fermer')
  })
  it('should render ReloadPrompt with refresh button', () => {
    mount(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon: OhVueIcon,
        },
      },
      props: {
        needRefresh: true,
      },
    })

    cy.get('button:nth-child(1)')
      .should('contain', 'Recharger')
      .should('not.have.class', 'fr-btn--secondary')
    cy.get('button:nth-child(2)')
      .should('contain', 'Fermer')
      .should('have.class', 'fr-btn--secondary')
  })
})
