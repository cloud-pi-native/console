import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import ProjectBanner from './ProjectBanner.vue'

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
})

function mountBanner(description = 'Description initiale') {
  const project = {
    id: 'project-1',
    name: 'Projet de test',
    slug: 'projet-de-test',
    description,
    locked: false,
    status: 'created',
    ownerId: 'user-1',
    operationsInProgress: [],
    myPerms: 0n,
  }
  const saved: string[] = []
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp({
    render: () => h(ProjectBanner, {
      project,
      canEditDescription: true,
      onSaveDescription: (value: string) => saved.push(value),
    }),
  })
  app.mount(container)
  apps.push(app)
  containers.push(container)
  return { container, project, saved }
}

function click(container: HTMLElement, testId: string) {
  const element = container.querySelector(`[data-testid="${testId}"]`)
  if (!(element instanceof HTMLElement)) throw new Error(`Élément introuvable : ${testId}`)
  element.click()
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const button = [...container.querySelectorAll('button')]
    .find(candidate => candidate.textContent?.trim() === text)
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Bouton introuvable : ${text}`)
  return button
}

async function typeDescription(container: HTMLElement, value: string) {
  const field = container.querySelector('textarea')
  if (!(field instanceof HTMLTextAreaElement)) throw new Error('Zone de description introuvable')
  field.value = value
  field.dispatchEvent(new Event('input'))
  await nextTick()
}

describe('projectBanner', () => {
  it('does not mutate the project entity when the edit is cancelled', async () => {
    const { container, project } = mountBanner()

    click(container, 'setDescriptionBtn')
    await nextTick()
    await typeDescription(container, 'Brouillon abandonné')
    findButtonByText(container, 'Annuler').click()
    await nextTick()

    expect(project.description).toBe('Description initiale')
  })

  it('emits the draft instead of writing to the store entity', async () => {
    const { container, project, saved } = mountBanner()

    click(container, 'setDescriptionBtn')
    await nextTick()
    await typeDescription(container, 'Nouvelle description')
    click(container, 'saveDescriptionBtn')
    await nextTick()

    expect(saved).toEqual(['Nouvelle description'])
    expect(project.description).toBe('Description initiale')
  })

  it('exposes an accessible name on the icon-only edit button', () => {
    const { container } = mountBanner()
    const button = container.querySelector('[data-testid="setDescriptionBtn"]')

    expect(button?.getAttribute('aria-label')).toBe('Modifier la description du projet')
  })
})
