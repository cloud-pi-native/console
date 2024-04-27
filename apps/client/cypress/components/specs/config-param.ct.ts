import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import ConfigParamComponent from '@/components/ConfigParam.vue'
import { ref } from 'vue'

describe('ConfigParamComponent.vue', () => {
  it('Affiche correctement le composant avec un champ de texte', () => {
    const props = {
      options: {
        value: ref('test'),
        description: 'Description test',
        name: 'Test Input',
        disabled: false,
        kind: 'text',
        placeholder: 'Placeholder test',
      },
    }

    cy.mount(ConfigParamComponent, { props })

    cy.contains('Test Input')
    cy.contains('Description test')
    cy.get('[data-testid="input"]').should('have.attr', 'placeholder', 'Placeholder test')
  })

  it('Affiche correctement le composant avec un bouton de commutation', () => {
    const props = {
      options: {
        value: ref('enabled'),
        description: 'Description test',
        name: 'Test Switch',
        disabled: false,
        kind: 'switch',
      },
    }

    cy.mount(ConfigParamComponent, { props })

    cy.contains('Test Switch')
    cy.contains('Description test')
    cy.get('[data-testid="switch"]').within(() => {
      cy.get('input')
        .should('have.length', 3) // Vérifie qu'il y a trois boutons de commutation
    })
  })

  it('Modifie correctement la valeur du composant', () => {
    const props = {
      options: {
        value: ref('enabled'),
        name: 'Test Switch',
        disabled: false,
        kind: 'switch',
      },
    }

    cy.mount(ConfigParamComponent, { props })

    // Vérifie que la valeur a été modifiée
    cy.get('[data-testid="switch"]').within(() => {
      cy.get('.fr-fieldset__element').eq(1).click() // Sélectionne le bouton de commutation "Défaut"
      cy.get('input').eq(1).should('be.checked')
    })
  })
})
