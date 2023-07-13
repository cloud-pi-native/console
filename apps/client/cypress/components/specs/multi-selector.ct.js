import VueDsfr from '@gouvminint/vue-dsfr'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@gouvminint/vue-dsfr/styles'
import '@/main.css'
import * as icons from '@/icons.js'
import MultiSelector from '@/components/MultiSelector.vue'

describe('MultiSelector.vue', () => {
  it('Should mount a MultiSelector', () => {
    const props = {
      options: [
        {
          name: 'name1',
          id: '1',
        }, {
          name: 'name2',
          id: '2',
        },
      ],
    }

    const extensions = {
      use: [
        [
          VueDsfr, { icons: Object.values(icons) },
        ],
      ],
    }

    cy.mount(MultiSelector, { extensions, props })
    cy.get('[data-testid$="-tag"]').should('not.exist')
    cy.get('option')
      .should('have.length', props.options.length + 1)
    cy.get('#multi-select')
      .select(props.options[1].name)
    cy.getByDataTestid(`${props.options[1].name}-tag`)
      .should('be.visible')
    cy.get('#multi-select')
      .select(props.options[0].name)
    cy.getByDataTestid(`${props.options[0].name}-tag`)
      .should('be.visible')
    cy.get('[data-testid$="-tag"]').should('have.length', 2)
    cy.getByDataTestid(`${props.options[0].name}-tag`)
      .click()
    cy.get('[data-testid$="-tag"]').should('have.length', 1)
  })
})
