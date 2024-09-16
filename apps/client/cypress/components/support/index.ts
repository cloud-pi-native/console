import type { mount } from '@cypress/vue'
/* eslint-disable ts/method-signature-style */
import './commands.js'

type MountParams = Parameters<typeof mount>
type OptionsParam = MountParams[1]

declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Helper mount function for Vue Components
       * @param component Vue Component or JSX Element to mount
       * @param options Options passed to mount the component
       */
      mount(
        component: any,
        options?: OptionsParam
      ): Chainable<any>
    }
  }
}
