import { vi } from 'vitest'
import { render } from '@testing-library/vue'

import { addIcons, OhVueIcon as VIcon } from 'oh-vue-icons'

import { RiRefreshLine, RiSearchLine, RiCloseLine } from 'oh-vue-icons/icons/ri/index.js'

import { DsfrButton } from '@gouvminint/vue-dsfr'

import ReloadPrompt from './ReloadPrompt.vue'

addIcons(RiRefreshLine, RiSearchLine, RiCloseLine)

vi.mock('virtual:pwa-register/vue', () => {
  return {
    useRegisterSW () {
      return {
        offlineReady: true,
        needRefresh: false,
        updateServiceWorker: vi.fn(),
      }
    },
  }
})

describe('ReloadPrompt', () => {
  it('should render ReloadPrompt with right content', async () => {
    // Given

    // When
    const { container, getByRole } = render(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon,
        },
      },
      props: {
        offlineReady: true,
      },
    })

    const navEl = getByRole('alert')
    const buttons = container.querySelectorAll('button')

    // Then
    expect(navEl.tagName).toBe('DIV')
    expect(buttons).toHaveLength(1)
    expect(navEl).toHaveClass('new-content-wrapper')
  })

  it('should render ReloadPrompt with need refresh', async () => {
    // Given

    // When
    const { container, getByRole } = render(ReloadPrompt, {
      global: {
        components: {
          DsfrButton,
          VIcon,
        },
      },
      props: {
        needRefresh: true,
      },
    })

    const navEl = getByRole('alert')
    const buttons = container.querySelectorAll('button')

    // Then
    expect(navEl.tagName).toBe('DIV')
    expect(buttons).toHaveLength(2)
    expect(navEl).toHaveClass('new-content-wrapper')
  })
})
