import VueDsfr from '@gouvminint/vue-dsfr'
import { createPinia } from 'pinia'
import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import * as icons from '@/icons.js'
import RangeInput from '@/components/RangeInput.vue'
import { levels } from 'shared/src/utils/iterables.js'

describe('RangeInput.vue', () => {
  it('Should mount a RangeInput', () => {
    const pinia = createPinia()

    const props = {
      label: 'RangeInput CT test',
      level: 1,
      levels,
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

    cy.mount(RangeInput, { extensions, props })

    cy.get('label[for="range"]')
      .should('have.length', 1)
      .and('contain', 'RangeInput CT test')
      .and('not.contain', '*')
    cy.get('input[list="rangeList"]')
      .should('have.value', props.level)
    cy.get('datalist#rangeList')
      .should('have.length', 1)
      .find('option')
      .should('have.length', levels.length)
    cy.get('option:first')
      .should('have.attr', 'label', levels[0])
  })
})
