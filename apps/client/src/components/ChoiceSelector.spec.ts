import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive } from 'vue'
import ChoiceSelector from './ChoiceSelector.vue'

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
})

function mountSelector(
  optionsSelected: string[] = [],
  initialOptions = Array.from({ length: 7 }, (_, index) => ({ id: `project-${index}`, label: `Projet ${index}` })),
  wrapped = false,
) {
  const state = reactive({ options: initialOptions, optionsSelected })
  const onUpdate = vi.fn()
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(ChoiceSelector, {
      id: 'projects-select',
      options: state.options,
      optionsSelected: state.options.filter(option => state.optionsSelected.includes(option.id)),
      label: 'Projets associés',
      description: '',
      labelKey: 'label',
      valueKey: 'id',
      wrapped,
      onUpdate,
    }),
  })
  app.mount(container)
  apps.push(app)
  containers.push(container)
  return { container, onUpdate, state }
}

function click(container: HTMLElement, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  if (!(element instanceof HTMLElement)) throw new Error(`Élément introuvable : ${testId}`)
  element.click()
}

describe('choiceSelector', () => {
  it('affiche les projets déjà associés quand les options arrivent après le montage', async () => {
    const { container, onUpdate, state } = mountSelector([], [])
    state.options = [{ id: 'project-a', label: 'Projet A' }, { id: 'project-b', label: 'Projet B' }]
    state.optionsSelected = ['project-a']
    await nextTick()

    expect(container.querySelector('[data-testid="project-a-projects-select-tag"]')?.closest('.fr-tag--dismiss')).not.toBeNull()
    click(container, 'project-b-projects-select-tag')
    await nextTick()
    expect(onUpdate.mock.calls[0][1]).toEqual(['project-a', 'project-b'])
    expect(container.querySelectorAll('.fr-tag--dismiss')).toHaveLength(2)
  })

  it.each([
    ['choice-selector-add-all-projects-select', 7],
    ['choice-selector-add-visible-projects-select', 7],
    ['choice-selector-remove-all-projects-select', 0],
    ['choice-selector-remove-visible-projects-select', 0],
  ])('émet la sélection complète après %s', async (testId, expectedCount) => {
    const selected = testId.includes('remove') ? Array.from({ length: 7 }, (_, index) => `project-${index}`) : []
    const { container, onUpdate } = mountSelector(selected)
    click(container, testId)
    await nextTick()
    expect(onUpdate).toHaveBeenCalledOnce()
    expect(onUpdate.mock.calls[0][1]).toEqual(
      expectedCount ? Array.from({ length: 7 }, (_, index) => `project-${index}`) : [],
    )
  })

  it('expose le bouton de révélation comme bouton natif dans les deux modes', () => {
    const modes: { label: string, expanded: string }[] = [
      { label: 'plié', expanded: 'false' },
      { label: 'déplié', expanded: 'true' },
    ]
    for (const { label, expanded } of modes) {
      const { container } = mountSelector([], Array.from({ length: 2 }, (_, index) => ({ id: `project-${index}`, label: `Projet ${index}` })), label === 'plié')
      const button = container.querySelector('button[aria-expanded]')
      expect(button, `mode ${label}`).toBeInstanceOf(HTMLButtonElement)
      expect(button?.getAttribute('aria-expanded')).toBe(expanded)
      // le libellé n'est plus un h6 : aucun rôle heading dans le bouton
      expect(button?.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull()
      // l'icône reste décorative
      expect(button?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('déploit le panneau quand le bouton de révélation est activé', async () => {
    const { container } = mountSelector([], undefined, true)
    const button = container.querySelector('button[aria-expanded]')
    if (!(button instanceof HTMLButtonElement)) throw new Error('Bouton de révélation introuvable')

    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.click()
    await nextTick()

    const reopened = container.querySelector('button[aria-expanded]')
    expect(reopened?.getAttribute('aria-expanded')).toBe('true')
    // le panneau déplié est accessible au clavier : ses actions sont des boutons
    expect(container.querySelector('[data-testid="choice-selector-add-all-projects-select"]')).not.toBeNull()
  })

  it('présente les actions du mode replié sous forme de boutons', async () => {
    const noSelection = mountSelector([], undefined, true)
    const emptyButton = noSelection.container.querySelector('button:has(.fr-tag)')
    expect(emptyButton).toBeInstanceOf(HTMLButtonElement)
    expect(emptyButton?.textContent).toContain('Aucune sélection, 7 choix disponibles')

    const many = mountSelector(['project-0', 'project-1', 'project-2', 'project-3'], undefined, true)
    expect(many.container.querySelector('button:has(.fr-tag)')?.textContent).toContain('et 1 de +')

    const few = mountSelector(['project-0'], undefined, true)
    expect(few.container.querySelector('button:has(.fr-tag)')?.textContent).toContain('Modifier')
  })
})
