import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import RangeInput from '@/components/RangeInput.vue'
import { levels } from '@dso-console/shared'

describe('RangeInput.vue', () => {
  it('Should mount a RangeInput', () => {
    const props = {
      label: 'RangeInput CT test',
      level: 1,
      levels,
    }

    cy.mount(RangeInput, { props })

    cy.get('label[for="range"]')
      .should('have.length', 1)
      .and('contain', 'RangeInput CT test')
      .and('not.contain', '*')
    cy.get('input[list="rangeList"]')
      .should('have.value', props.level)
    cy.get('input[list="rangeList"]')
      .invoke('val', 2)
      .trigger('input')
    cy.get('input[list="rangeList"]')
      .should('have.value', 2)
    cy.get('datalist#rangeList')
      .should('have.length', 1)
      .find('option')
      .should('have.length', levels.length)
    cy.get('option:first')
      .should('have.attr', 'label', levels[0])
  })
})
