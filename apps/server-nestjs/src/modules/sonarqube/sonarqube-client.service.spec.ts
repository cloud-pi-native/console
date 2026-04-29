import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { makeSonarqubeGeneratedToken, makeSonarqubeGroup, makeSonarqubePaging, makeSonarqubeProject, makeSonarqubeUser } from './sonarqube-testing.utils'

const sonarUrl = 'https://sonarqube.internal'
const sonarToken = 'my-token'
const expectedAuth = `Basic ${Buffer.from(`${sonarToken}:`, 'utf8').toString('base64')}`

const server = setupServer()

function createTestingModule() {
  return Test.createTestingModule({
    providers: [
      SonarqubeClientService,
      SonarqubeHttpClientService,
      {
        provide: ConfigurationService,
        useValue: {
          sonarApiToken: sonarToken,
          getInternalOrPublicSonarqubeUrl: () => sonarUrl,
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('sonarqubeClientService', () => {
  let service: SonarqubeClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    const module = await createTestingModule().compile()
    service = module.get(SonarqubeClientService)
  })
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('userGroupsSearch', () => {
    it('should GET user_groups/search with auth', async () => {
      const group = makeSonarqubeGroup({ name: 'my-group' })
      server.use(
        http.get(`${sonarUrl}/api/user_groups/search`, ({ request }) => {
          expect(request.headers.get('authorization')).toBe(expectedAuth)
          expect(new URL(request.url).searchParams.get('q')).toBe('my-group')
          return HttpResponse.json({ paging: makeSonarqubePaging({ total: 1 }), groups: [group] })
        }),
      )
      const result = await service.searchUserGroups({ q: 'my-group' })
      expect(result.groups).toEqual([group])
    })
  })

  describe('userGroupsCreate', () => {
    it('should POST user_groups/create', async () => {
      server.use(
        http.post(`${sonarUrl}/api/user_groups/create`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('name')).toBe('new-group')
          return HttpResponse.json({})
        }),
      )
      await expect(service.createUserGroups({ name: 'new-group' })).resolves.not.toThrow()
    })
  })

  describe('usersSearch', () => {
    it('should GET users/search', async () => {
      const user = makeSonarqubeUser({ login: 'my-user' })
      server.use(
        http.get(`${sonarUrl}/api/users/search`, () =>
          HttpResponse.json({ paging: makeSonarqubePaging({ total: 1 }), users: [user] })),
      )
      const result = await service.searchUsers({ q: 'my-user' })
      expect(result.users).toEqual([user])
    })
  })

  describe('usersCreate', () => {
    it('should POST users/create with all params as query string', async () => {
      server.use(
        http.post(`${sonarUrl}/api/users/create`, ({ request }) => {
          const params = new URL(request.url).searchParams
          expect(params.get('login')).toBe('proj')
          expect(params.get('email')).toBe('proj@proj')
          expect(params.get('local')).toBe('true')
          return HttpResponse.json({})
        }),
      )
      await service.createUser({ email: 'proj@proj', local: 'true', login: 'proj', name: 'proj', password: 'pw' })
    })
  })

  describe('usersDeactivate', () => {
    it('should POST users/deactivate with anonymize param', async () => {
      server.use(
        http.post(`${sonarUrl}/api/users/deactivate`, ({ request }) => {
          const params = new URL(request.url).searchParams
          expect(params.get('login')).toBe('proj')
          expect(params.get('anonymize')).toBe('true')
          return HttpResponse.json({})
        }),
      )
      await service.deactivateUser({ login: 'proj', anonymize: true })
    })
  })

  describe('userTokensRevoke / userTokensGenerate', () => {
    it('should POST user_tokens/revoke', async () => {
      server.use(
        http.post(`${sonarUrl}/api/user_tokens/revoke`, () => HttpResponse.json({})),
      )
      await expect(service.revokeUserToken({ login: 'proj', name: 'Sonar Token for proj' })).resolves.not.toThrow()
    })

    it('should POST user_tokens/generate and return the token', async () => {
      const generated = makeSonarqubeGeneratedToken({ token: 'tok-abc' })
      server.use(
        http.post(`${sonarUrl}/api/user_tokens/generate`, () => HttpResponse.json(generated)),
      )
      const result = await service.generateUserToken({ login: 'proj', name: 'Sonar Token for proj' })
      expect(result.token).toBe('tok-abc')
    })
  })

  describe('projectsSearch', () => {
    it('should GET projects/search', async () => {
      const project = makeSonarqubeProject({ key: 'my-project-repo-ab12' })
      server.use(
        http.get(`${sonarUrl}/api/projects/search`, () =>
          HttpResponse.json({ paging: makeSonarqubePaging({ total: 1 }), components: [project] })),
      )
      const result = await service.searchProject({ q: 'my-project' })
      expect(result.components).toEqual([project])
    })
  })

  describe('projectsDelete', () => {
    it('should POST projects/delete with project key as query param', async () => {
      server.use(
        http.post(`${sonarUrl}/api/projects/delete`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('project')).toBe('my-key')
          return HttpResponse.json({})
        }),
      )
      await service.deleteProject({ project: 'my-key' })
    })
  })

  describe('permissionsAddGroup', () => {
    it('should POST permissions/add_group with global params', async () => {
      server.use(
        http.post(`${sonarUrl}/api/permissions/add_group`, ({ request }) => {
          const params = new URL(request.url).searchParams
          expect(params.get('groupName')).toBe('/admin')
          expect(params.get('permission')).toBe('admin')
          expect(params.has('projectKey')).toBe(false)
          return HttpResponse.json({})
        }),
      )
      await service.addPermissionGroup({ groupName: '/admin', permission: 'admin' })
    })

    it('should POST permissions/add_group with projectKey for project-scoped call', async () => {
      server.use(
        http.post(`${sonarUrl}/api/permissions/add_group`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('projectKey')).toBe('proj-key')
          return HttpResponse.json({})
        }),
      )
      await service.addPermissionGroup({ groupName: '/proj', permission: 'scan', projectKey: 'proj-key' })
    })
  })
})
