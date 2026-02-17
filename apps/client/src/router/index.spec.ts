import { describe, it, expect, beforeEach } from 'vitest'
import { faker } from '@faker-js/faker'
import type { ProjectV2 } from '@cpn-console/shared'
import { detectProjectslug, createAppRouter } from './index.js'
import { useUserStore } from '@/stores/user.js'
import { useProjectStore } from '@/stores/project.js'
import { useSystemSettingsStore } from '@/stores/system-settings.js'

describe('router index', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('detect project slug helper', () => {
    let projectStore: ReturnType<typeof useProjectStore>
    let slug: string
    let uuid: string

    beforeEach(() => {
      projectStore = useProjectStore()
      slug = faker.lorem.slug()
      uuid = faker.string.uuid()
      const now = new Date().toISOString()
      const ownerId = faker.string.uuid()
      const project: ProjectV2 = {
        id: uuid,
        clusterIds: [],
        description: '',
        everyonePerms: '0',
        name: slug,
        slug,
        locked: false,
        owner: {
          type: 'human',
          id: ownerId,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          createdAt: now,
          updatedAt: now,
          lastLogin: now,
        },
        ownerId,
        roles: [],
        members: [],
        createdAt: now,
        updatedAt: now,
        limitless: false,
        hprodMemory: 0,
        hprodCpu: 0,
        hprodGpu: 0,
        prodMemory: 0,
        prodCpu: 0,
        prodGpu: 0,
        status: 'created',
        lastSuccessProvisionningVersion: null,
      }
      projectStore.updateStore([project])
    })

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

  describe('navigation with real router instance', () => {
    it('renders home and navigates to projects', async () => {
      const router = createAppRouter('')
      const userStore = useUserStore()
      const systemStore = useSystemSettingsStore()

      // Ensure global guard does not redirect to /login
      // by simulating an authenticated user.
      userStore.isLoggedIn = true
      userStore.setIsLoggedIn = async () => {}
      systemStore.listSystemSettings = async () => {}
      router.push('/')
      await router.isReady()

      expect(router.currentRoute.value.name).toEqual('Home')

      await router.push('/projects')
      await router.isReady()

      expect(router.currentRoute.value.matched.some(r => r.name === 'Projects')).toBe(true)
    })
  })
})
