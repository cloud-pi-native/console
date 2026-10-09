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

function mountSelector(optionsSelected: string[] = [], initialOptions = Array.from({ length: 7 }, (_, index) => ({ id: `project-${index}`, label: `Projet ${index}` }))) {
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
      wrapped: false,
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
})
