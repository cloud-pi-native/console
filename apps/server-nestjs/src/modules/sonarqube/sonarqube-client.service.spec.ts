import type { ConfigType } from '@nestjs/config'
import type { AddPermissionGroupParams, CreateUserParams, DeactivateUserParams, RevokeUserTokenParams } from './sonarqube-client.service'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { factory, primaryKey } from '@mswjs/data'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { makeSonarqubeGeneratedToken, makeSonarqubeGroup, makeSonarqubePaging, makeSonarqubeProject, makeSonarqubeUser } from './sonarqube-testing.utils'

const sonarUrl = 'https://sonarqube.internal'
const sonarToken = 'my-token'
const sonarAuthHeader = `Bearer ${sonarToken}`

const db = factory({
  group: { id: primaryKey(String), ...makeSonarqubeGroup() },
  user: { id: primaryKey(String), ...makeSonarqubeUser() },
  project: { id: primaryKey(String), ...makeSonarqubeProject() },
  token: { id: primaryKey(() => faker.string.uuid()), ...makeSonarqubeGeneratedToken() },
})

const server = setupServer(
  http.get(`${sonarUrl}/api/user_groups/search`, ({ request }) => {
    expect(request.headers.get('authorization')).toBe(sonarAuthHeader)
    const q = new URL(request.url).searchParams.get('q')
    const groups = q ? db.group.findMany({ where: { name: { equals: q } } }) : db.group.getAll()
    return HttpResponse.json({ paging: makeSonarqubePaging({ total: groups.length }), groups })
  }),
  http.post(`${sonarUrl}/api/user_groups/create`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    expect(params.get('name')).toBe('new-group')
    db.group.create(makeSonarqubeGroup({ id: faker.string.uuid(), name: params.get('name') as string }))
    return HttpResponse.json({})
  }),
  http.get(`${sonarUrl}/api/users/search`, () => {
    const users = db.user.getAll()
    return HttpResponse.json({ paging: makeSonarqubePaging({ total: users.length }), users })
  }),
  http.post(`${sonarUrl}/api/users/create`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    db.user.create(makeSonarqubeUser({ id: faker.string.uuid(), login: params.get('login') as string }))
    return HttpResponse.json({})
  }),
  http.post(`${sonarUrl}/api/users/deactivate`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    db.user.deleteMany({ where: { login: { equals: params.get('login') as string } } })
    return HttpResponse.json({})
  }),
  http.post(`${sonarUrl}/api/user_tokens/revoke`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    db.token.deleteMany({ where: { login: { equals: params.get('login') as string } } })
    return HttpResponse.json({})
  }),
  http.post(`${sonarUrl}/api/user_tokens/generate`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    const generated = makeSonarqubeGeneratedToken({ login: params.get('login') as string, name: params.get('name') as string })
    db.token.create(generated)
    return HttpResponse.json(generated)
  }),
  http.get(`${sonarUrl}/api/projects/search`, () => {
    const projects = db.project.getAll()
    return HttpResponse.json({ paging: makeSonarqubePaging({ total: projects.length }), components: projects })
  }),
  http.post(`${sonarUrl}/api/projects/delete`, async ({ request }) => {
    const params = new URL(request.url).searchParams
    db.project.deleteMany({ where: { key: { equals: params.get('project') as string } } })
    return HttpResponse.json({})
  }),
  http.post(`${sonarUrl}/api/permissions/add_group`, () => HttpResponse.json({})),
)

describe('sonarqubeClientService', () => {
  let service: SonarqubeClientService
  let config: ReturnType<typeof mockDeep<ConfigType<typeof sonarqubeConfigFactory>>>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof sonarqubeConfigFactory>>({
      apiToken: sonarToken,
      url: sonarUrl,
      internalUrl: undefined,
    })

    const module = await Test.createTestingModule({
      providers: [
        SonarqubeClientService,
        SonarqubeHttpClientService,
        { provide: sonarqubeConfigFactory.KEY, useValue: config },
      ],
    }).compile()

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
      db.group.create(group)

      const result = await service.searchUserGroup({ q: 'my-group' })
      expect(result.groups).toEqual([group])
    })
  })

  describe('userGroupsCreate', () => {
    it('should POST user_groups/create', async () => {
      await expect(service.createUserGroup({ name: 'new-group' })).resolves.not.toThrow()
      expect(db.group.count({ where: { name: { equals: 'new-group' } } })).toBe(1)
    })
  })

  describe('usersSearch', () => {
    it('should GET users/search', async () => {
      const user = makeSonarqubeUser({ login: 'my-user' })
      db.user.create(user)

      const result = await service.searchUsers({ q: 'my-user' })
      expect(result.users).toEqual([user])
    })
  })

  describe('usersCreate', () => {
    it('should POST users/create with all params as query string', async () => {
      const user = {
        email: faker.internet.email(),
        local: 'true',
        login: faker.internet.username(),
        name: faker.internet.username(),
        password: faker.internet.password(),
      } satisfies CreateUserParams
      await service.createUser(user)
      expect(db.user.count({ where: { login: { equals: user.login } } })).toBe(1)
    })
  })

  describe('usersDeactivate', () => {
    it('should POST users/deactivate with anonymize param', async () => {
      const user = {
        login: faker.internet.username(),
        anonymize: true,
      } satisfies DeactivateUserParams
      db.user.create(makeSonarqubeUser({ id: faker.string.uuid(), login: user.login }))
      await service.deactivateUser(user)
      expect(db.user.count({ where: { login: { equals: user.login } } })).toBe(0)
    })
  })

  describe('userTokensRevoke / userTokensGenerate', () => {
    it('should POST user_tokens/revoke', async () => {
      const token = makeSonarqubeGeneratedToken()
      const revoke = {
        login: token.login,
        name: token.name,
      } satisfies RevokeUserTokenParams
      db.token.create(token)
      await expect(service.revokeUserToken(revoke)).resolves.not.toThrow()
      expect(db.token.count()).toBe(0)
    })

    it('should POST user_tokens/generate and return the token', async () => {
      const generated = makeSonarqubeGeneratedToken()
      const result = await service.generateUserToken({ login: generated.login, name: generated.name })
      expect(result.token).toBe(generated.token)
      expect(db.token.count({ where: { token: { equals: generated.token } } })).toBe(1)
    })
  })

  describe('projectsSearch', () => {
    it('should GET projects/search', async () => {
      const project = makeSonarqubeProject()
      db.project.create(project)

      const result = await service.searchProject({ q: project.name })
      expect(result.components).toEqual([project])
    })
  })

  describe('projectsDelete', () => {
    it('should POST projects/delete with project key as query param', async () => {
      const project = makeSonarqubeProject()
      db.project.create(project)
      await service.deleteProject({ project: project.key })
      expect(db.project.count({ where: { key: { equals: project.key } } })).toBe(0)
    })
  })

  describe('permissionsAddGroup', () => {
    it('should POST permissions/add_group with global params', async () => {
      const group = {
        groupName: '/admin',
        permission: 'admin',
      } satisfies AddPermissionGroupParams
      await service.addPermissionGroup(group)
    })

    it('should POST permissions/add_group with projectKey for project-scoped call', async () => {
      await service.addPermissionGroup({ groupName: '/proj', permission: 'scan', projectKey: 'proj-key' })
    })
  })
})
