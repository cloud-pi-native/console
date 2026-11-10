import type { Member } from '@cpn-console/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'
import ProjectRoleForm from './ProjectRoleForm.vue'

// Stubs rendant tous les panneaux simultanément : le sujet sous test est la
// liste des membres, pas la navigation par onglets de vue-dsfr.
// Factory async : vi.mock est hissé au-dessus des déclarations.
vi.mock('@gouvminint/vue-dsfr', async () => {
  const { defineComponent, h } = await import('vue')
  const DsfrTabs = defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    },
  })
  const DsfrTabContent = defineComponent({
    props: { panelId: { type: String, required: true } },
    setup(props, { slots }) {
      return () => h('div', { 'data-testid': `panel-${props.panelId}` }, slots.default?.())
    },
  })
  const DsfrNotice = defineComponent({
    setup(_, { slots }) {
      return () => h('div', slots.default?.())
    },
  })
  const DsfrInput = defineComponent({
    setup() {
      return () => h('input')
    },
  })
  const DsfrCheckbox = defineComponent({
    props: {
      id: { type: String, required: true },
      disabled: { type: Boolean, default: false },
      modelValue: { type: Boolean, default: false },
    },
    emits: { 'update:modelValue': (_value: boolean) => true },
    setup(props, { emit }) {
      return () => h('input', {
        type: 'checkbox',
        'data-testid': `input-checkbox-${props.id}`,
        disabled: props.disabled,
        checked: props.modelValue,
        onChange: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).checked),
      })
    },
  })
  const DsfrButton = defineComponent({
    setup(_, { slots }) {
      return () => h('button', slots.default?.())
    },
  })
  return {
    DsfrTabs,
    DsfrTabContent,
    DsfrNotice,
    DsfrInput,
    DsfrCheckbox,
    DsfrButton,
  }
})

const apps: ReturnType<typeof createApp>[] = []
const containers: HTMLElement[] = []

afterEach(() => {
  apps.forEach(app => app.unmount())
  containers.forEach(container => container.remove())
  apps.length = 0
  containers.length = 0
})

function mountForm(allMembers: Member[], onUpdateMemberRoles: (...args: unknown[]) => unknown = () => {}) {
  const container = document.createElement('div')
  document.body.append(container)
  const app = createApp(defineComponent({
    setup() {
      return () => h(ProjectRoleForm, {
        id: 'role-1',
        name: 'Rôle test',
        permissions: 0n,
        projectId: '00000000-0000-4000-8000-000000000000',
        isEveryone: false,
        type: 'managed',
        allMembers,
        onDelete: () => {},
        onUpdateMemberRoles,
        onSave: () => {},
        onCancel: () => {},
      })
    },
  }))
  app.mount(container)
  apps.push(app)
  containers.push(container)
  return container
}

function memberCheckbox(container: HTMLElement, userId: string) {
  const element = container.querySelector(`[data-testid="panel-members"] input[data-testid="input-checkbox-${userId}-cbx"]`)
  if (!(element instanceof HTMLInputElement)) throw new Error(`Case du membre introuvable : ${userId}`)
  return element
}

describe('projectRoleForm members list', () => {
  const owner: Member = {
    userId: '00000000-0000-4000-8000-000000000001',
    firstName: 'Alice',
    lastName: 'Owner',
    email: 'alice@example.com',
    roleIds: [],
  }

  it('affiche le propriétaire servi par l\'API dans la liste des membres', () => {
    const container = mountForm([owner])

    const ownerCheckbox = memberCheckbox(container, owner.userId)
    expect(ownerCheckbox.disabled).toBe(false)
    expect(ownerCheckbox.checked).toBe(false)
  })

  it('propage l\'attribution du rôle à un membre servi par l\'API', async () => {
    const onUpdateMemberRoles = vi.fn()
    const container = mountForm([owner], onUpdateMemberRoles)

    memberCheckbox(container, owner.userId).click()
    await Promise.resolve()
    expect(onUpdateMemberRoles).toHaveBeenCalledWith(true, owner.userId)
  })
})
