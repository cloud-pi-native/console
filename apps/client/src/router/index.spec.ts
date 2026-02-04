import { describe, it, expect } from 'vitest'
import { detectProjectslug, routes } from './index.js'
import { useUserStore } from '@/stores/user.js'
import { useAdminRoleStore } from '@/stores/admin-role.js'
import { useProjectStore } from '@/stores/project.js'
import { ADMIN_PERMS } from '@cpn-console/shared'

setActivePinia(createPinia())
describe('test router functions: detectProjectslug', () => {
  const projectStore = useProjectStore()
  const slug = 'the-slug'
  const uuid = crypto.randomUUID()
  projectStore.updateStore([{
    slug,
    id: uuid,
  } as any])
  it('it should return project\'slug with uuid passed', () => {
    const slugFound = detectProjectslug({
      params: {
        slug: uuid,
      },
    })
    expect(slugFound).toEqual(slug)
  })

  it('it should return project\'slug with slug passed', () => {
    const slugFound = detectProjectslug({
      params: {
        slug,
      },
    })
    expect(slugFound).toEqual(slug)
  })
})

describe('createProject route guard', () => {
  const createProjectRoute = routes.find(r => r.name === 'CreateProject')
  // @ts-ignore
  const beforeEnter = createProjectRoute?.beforeEnter as any

  it('should redirect to Projects if user is not admin', () => {
    const userStore = useUserStore()
    const adminRoleStore = useAdminRoleStore()

    // Reset stores
    userStore.apiAuthInfos = undefined
    adminRoleStore.roles = []

    const result = beforeEnter()
    expect(result).toEqual({ name: 'Projects' })
  })

  it('should allow access if user has MANAGE_PROJECTS permission', () => {
    const userStore = useUserStore()
    const adminRoleStore = useAdminRoleStore()

    const roleId = 'role-1'
    adminRoleStore.roles = [{
      id: roleId,
      name: 'Project Manager',
      permissions: ADMIN_PERMS.MANAGE_PROJECTS.toString(),
      position: 1,
      type: 'custom',
      oidcGroup: 'group',
    }]

    userStore.apiAuthInfos = {
      adminRoleIds: [roleId],
    } as any

    const result = beforeEnter()
    expect(result).toBeUndefined()
  })
})
