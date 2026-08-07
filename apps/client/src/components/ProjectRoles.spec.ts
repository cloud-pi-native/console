import type { Project } from '@/utils/project-utils.js'
import { shallowMount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import ProjectRoleForm from './ProjectRoleForm.vue'
import ProjectRoles from './ProjectRoles.vue'

// Minimal mock of the Project class that focuses on the Members.patch
// behavior relevant to the lost-update race (issue #2089).
// The server does replace-by-full-list: it stores whatever `roles` the PATCH
// sends, then `list()` refreshes the local snapshot from that server state.
function makeMockProject(serverMembers: { userId: string, roleIds: string[] }[]) {
  const project = {
    id: 'proj-1',
    members: structuredClone(serverMembers),
    roles: [
      { id: 'roleA', name: 'Role A', permissions: '0', position: 0, projectId: 'proj-1' },
      { id: 'roleB', name: 'Role B', permissions: '0', position: 1, projectId: 'proj-1' },
    ],
    everyonePerms: '0',
    myPerms: 0n,
    operationsInProgress: { value: [] },
    needReplay: { value: false },
    Members: {
      list: vi.fn(async () => {
        project.members = structuredClone(serverMembers)
        return project.members
      }),
      create: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn(async (body: { userId: string, roles: string[] }[]) => {
        // Simulate network latency BEFORE the snapshot refreshes.
        await new Promise(r => setTimeout(r, 10))
        for (const { userId, roles } of body) {
          const s = serverMembers.find(m => m.userId === userId)
          if (s) s.roleIds = [...roles] // server replace-by-full-list
        }
        // list() refreshes local snapshot from server.
        project.members = structuredClone(serverMembers)
        return project.members
      }),
      getCandidateUsers: vi.fn(),
    },
    Roles: {
      countMembers: vi.fn(),
      list: vi.fn(),
      patch: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    Commands: {
      update: vi.fn(),
      updateData: vi.fn(),
      refresh: vi.fn(),
      replay: vi.fn(),
      delete: vi.fn(),
    },
    Repositories: {
      list: vi.fn(),
      sync: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    Environments: {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    Services: {
      getSecrets: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
    },
    Logs: {
      list: vi.fn(),
    },
    computePerms: vi.fn(),
  }
  return { project, serverMembers }
}

describe('projectRoles.vue — rapid role assignment (issue #2089)', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
  })

  it('persists all roles when rapidly assigning multiple roles to the same member', async () => {
    const { project, serverMembers } = makeMockProject([
      { userId: 'u1', roleIds: [] },
    ])

    const wrapper = shallowMount(ProjectRoles, {
      props: { project: project as unknown as Project },
      global: {
        stubs: {
          ProjectRoleForm: true,
          DsfrButton: true,
          VIcon: true,
        },
      },
    })

    // Select "roleA" so selectedRole is defined (updateMember early-returns otherwise).
    await wrapper.find('[data-testid="roleA-tab"]').trigger('click')
    await nextTick()

    // User rapidly checks roleA then roleB on the same member (issue step 3).
    // Both emits fire before the first patch's list() refresh lands.
    wrapper.findComponent(ProjectRoleForm).vm.$emit('update-member-roles', true, 'u1')

    // Quickly switch to roleB and fire the second toggle.
    // Re-find the stub because :key="selectedRole.id" recreates ProjectRoleForm.
    await wrapper.find('[data-testid="roleB-tab"]').trigger('click')
    await nextTick()
    wrapper.findComponent(ProjectRoleForm).vm.$emit('update-member-roles', true, 'u1')

    // Wait for all pending operations to complete.
    await new Promise(r => setTimeout(r, 100))
    await nextTick()

    const actual = serverMembers.find(m => m.userId === 'u1').roleIds
    expect(actual).toContain('roleA')
    expect(actual).toContain('roleB')
    expect(actual).toHaveLength(2)
    expect(project.Members.patch).toHaveBeenCalledTimes(2)
  })

  it('serializes PATCHes so the second reads server-confirmed state', async () => {
    const { project, serverMembers } = makeMockProject([
      { userId: 'u1', roleIds: [] },
    ])

    const wrapper = shallowMount(ProjectRoles, {
      props: { project: project as unknown as Project },
      global: {
        stubs: {
          ProjectRoleForm: true,
          DsfrButton: true,
          VIcon: true,
        },
      },
    })

    await wrapper.find('[data-testid="roleA-tab"]').trigger('click')
    await nextTick()

    // First toggle: add roleA
    wrapper.findComponent(ProjectRoleForm).vm.$emit('update-member-roles', true, 'u1')
    // Second toggle: remove roleA (should see it was added first, then removed)
    wrapper.findComponent(ProjectRoleForm).vm.$emit('update-member-roles', false, 'u1')

    await new Promise(r => setTimeout(r, 100))
    await nextTick()

    expect(project.Members.patch).toHaveBeenCalledTimes(2)
    // After add then remove, the final server state should be empty.
    const actual = serverMembers.find(m => m.userId === 'u1').roleIds
    expect(actual).toEqual([])
  })
})
