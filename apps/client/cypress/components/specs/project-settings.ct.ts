import '@gouvminint/vue-dsfr/styles'
import '@gouvfr/dsfr/dist/dsfr.min.css'
import '@gouvfr/dsfr/dist/utility/icons/icons.min.css'
import '@gouvfr/dsfr/dist/utility/utility.main.min.css'
import '@/main.css'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import ProjectSettings from '@/components/ProjectSettings.vue'
import type { ComponentCustomProps } from 'vue'

describe('ProjectSettings.vue', () => {
  it('Should mount a ProjectSettings', () => {
    const randomDbSetup = createRandomDbSetup({})

    const props = {
      project: randomDbSetup.project,
    }

    cy.mount(ProjectSettings, { props } as ComponentCustomProps)

    cy.getByDataTestid('limitlessProjectSwitch')
      .should('be.visible')
      .and('not.be.checked')
  })
})
