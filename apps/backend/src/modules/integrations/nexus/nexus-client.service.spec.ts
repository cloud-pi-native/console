import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { nexusConfigFactory } from '../../../config/nexus.config'
import { NexusClientService } from './nexus-client.service'
import { NexusHttpClientService } from './nexus-http-client.service'
import { makeNexusUser, makePrivilegeName, makeRepoName, makeRoleId, makeUserId } from './nexus-testing.utils'

const nexusUrl = 'https://nexus.internal'

const server = setupServer()
const nexusAdminPassword = faker.internet.password()
const basicAuth = `Basic ${Buffer.from(`admin:${nexusAdminPassword}`, 'utf8').toString('base64')}`

describe('nexusClientService', () => {
  let service: NexusClientService
  let config: DeepMockProxy<ConfigType<typeof nexusConfigFactory>>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    config = mockDeep<ConfigType<typeof nexusConfigFactory>>({
      internalUrl: nexusUrl,
      admin: 'admin',
      adminPassword: nexusAdminPassword,
    })

    const module = await Test.createTestingModule({
      providers: [
        NexusClientService,
        NexusHttpClientService,
        {
          provide: nexusConfigFactory.KEY,
          useValue: config,
        },
      ],
    }).compile()

    service = module.get(NexusClientService)
  })

  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should return null on 404 (getRepositoriesMavenHosted)', async () => {
    server.use(
      http.get(`${nexusUrl}/service/rest/v1/repositories/maven/hosted/:name`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe(basicAuth)
        return HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })
      }),
    )

    await expect(service.getRepositoriesMavenHosted('missing')).resolves.toBeNull()
  })

  it('should send basic auth and plain text body on change-password', async () => {
    server.use(
      http.put(`${nexusUrl}/service/rest/v1/security/users/:userId/change-password`, async ({ request, params }) => {
        expect(request.method).toBe('PUT')
        expect(request.url).toBe(`${nexusUrl}/service/rest/v1/security/users/u1/change-password`)
        expect(params.userId).toBe('u1')
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(request.headers.get('content-type')).toContain('text/plain')
        expect(await request.text()).toBe('pw123')
        return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
      }),
    )

    await service.updateSecurityUsersChangePassword('u1', 'pw123')
  })

  it('should re-fetch the existing role when ensureSecurityRoles hits a 409', async () => {
    const role = { id: 'proj-role-id', name: 'proj-role-id', description: 'desc', privileges: ['nx-app'] }
    server.use(
      http.post(`${nexusUrl}/service/rest/v1/security/roles`, () =>
        HttpResponse.json({ errorMessage: 'Role already exists' }, { status: HttpStatus.CONFLICT })),
      http.get(`${nexusUrl}/service/rest/v1/security/roles/:id`, () => HttpResponse.json(role)),
    )

    await expect(service.ensureSecurityRoles(role)).resolves.toEqual(role)
  })

  it('should rethrow non-collision errors from ensureSecurityRoles without re-fetching', async () => {
    let fetches = 0
    server.use(
      http.post(`${nexusUrl}/service/rest/v1/security/roles`, () => {
        fetches++
        return HttpResponse.json({ errorMessage: 'Internal error' }, { status: HttpStatus.INTERNAL_SERVER_ERROR })
      }),
    )

    await expect(service.ensureSecurityRoles({ id: 'r', name: 'r', description: 'desc', privileges: [] }))
      .rejects.toThrow('responded 500')
    expect(fetches).toBe(1)
  })

  it('should re-fetch the existing repository when ensureRepositoriesMavenHosted hits a 400 already-exists', async () => {
    const repo = {
      name: 'proj-hosted',
      online: true,
      storage: { blobStoreName: 'default', strictContentTypeValidation: true, writePolicy: 'ALLOW' },
      component: { proprietaryComponents: true },
      maven: { versionPolicy: 'MIXED', layoutPolicy: 'STRICT', contentDisposition: 'ATTACHMENT' },
    }
    server.use(
      http.post(`${nexusUrl}/service/rest/v1/repositories/maven/hosted`, () =>
        new HttpResponse(null, { status: HttpStatus.BAD_REQUEST, statusText: 'Repository already exists' })),
      http.get(`${nexusUrl}/service/rest/v1/repositories/maven/hosted/:name`, () => HttpResponse.json(repo)),
    )

    await expect(service.ensureRepositoriesMavenHosted(repo)).resolves.toEqual(repo)
  })

  it('should rethrow a 400 without an already-exists message from ensureRepositoriesMavenHosted', async () => {
    server.use(
      http.post(`${nexusUrl}/service/rest/v1/repositories/maven/hosted`, () =>
        new HttpResponse(null, { status: HttpStatus.BAD_REQUEST, statusText: 'Bad Request' })),
    )

    await expect(service.ensureRepositoriesMavenHosted({
      name: 'proj-hosted',
      online: true,
      storage: { blobStoreName: 'default', strictContentTypeValidation: true, writePolicy: 'ALLOW' },
      component: { proprietaryComponents: true },
      maven: { versionPolicy: 'MIXED', layoutPolicy: 'STRICT', contentDisposition: 'ATTACHMENT' },
    })).rejects.toThrow('responded 400')
  })

  describe('maven group repositories', () => {
    it('reads a maven group and returns null when missing', async () => {
      const name = makeRepoName()
      const repo = {
        name,
        online: true,
        storage: { blobStoreName: 'default', strictContentTypeValidation: true },
        group: { memberNames: [makeRepoName()] },
      }
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/maven/group/:name`, () => HttpResponse.json(repo)),
      )

      await expect(service.getRepositoriesMavenGroup(name)).resolves.toEqual(repo)

      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/maven/group/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.getRepositoriesMavenGroup(name)).resolves.toBeNull()
    })

    it('ensures a maven group: creates then reloads on collision', async () => {
      const repo = {
        name: makeRepoName(),
        online: true,
        storage: { blobStoreName: 'default', strictContentTypeValidation: true },
        group: { memberNames: [makeRepoName()] },
      }
      server.use(
        http.post(`${nexusUrl}/service/rest/v1/repositories/maven/group`, () =>
          new HttpResponse(null, { status: HttpStatus.BAD_REQUEST, statusText: 'Repository already exists' })),
        http.get(`${nexusUrl}/service/rest/v1/repositories/maven/group/:name`, () => HttpResponse.json(repo)),
      )

      await expect(service.ensureRepositoriesMavenGroup(repo)).resolves.toEqual(repo)
    })

    it('updates a maven group', async () => {
      const name = makeRepoName()
      const calls: string[] = []
      server.use(
        http.put(`${nexusUrl}/service/rest/v1/repositories/maven/group/:name`, ({ request }) => {
          calls.push(request.method)
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.updateRepositoriesMavenGroup(name, {
        name,
        online: true,
        storage: { blobStoreName: 'default', strictContentTypeValidation: true },
        group: { memberNames: [makeRepoName()] },
      })

      expect(calls).toEqual(['PUT'])
    })
  })

  describe('npm repositories', () => {
    const makeNpmHosted = () => ({
      name: makeRepoName(),
      online: true,
      storage: { blobStoreName: 'default', strictContentTypeValidation: true, writePolicy: 'ALLOW' },
      component: { proprietaryComponents: false },
    })

    it('reads an npm hosted and returns null when missing', async () => {
      const repo = makeNpmHosted()
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/hosted/:name`, () => HttpResponse.json(repo)),
      )

      await expect(service.getRepositoriesNpmHosted(repo.name)).resolves.toEqual(repo)

      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/hosted/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.getRepositoriesNpmHosted(repo.name)).resolves.toBeNull()
    })

    it('ensures an npm hosted and reloads on collision', async () => {
      const repo = makeNpmHosted()
      server.use(
        http.post(`${nexusUrl}/service/rest/v1/repositories/npm/hosted`, () =>
          new HttpResponse(null, { status: HttpStatus.BAD_REQUEST, statusText: 'Repository already exists' })),
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/hosted/:name`, () => HttpResponse.json(repo)),
      )

      await expect(service.ensureRepositoriesNpmHosted(repo)).resolves.toEqual(repo)
    })

    it('updates an npm hosted', async () => {
      const repo = makeNpmHosted()
      const calls: string[] = []
      server.use(
        http.put(`${nexusUrl}/service/rest/v1/repositories/npm/hosted/:name`, ({ request }) => {
          calls.push(request.method)
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.updateRepositoriesNpmHosted(repo.name, repo)

      expect(calls).toEqual(['PUT'])
    })

    it('reads an npm group and returns null when missing', async () => {
      const repo = {
        name: makeRepoName(),
        online: true,
        storage: { blobStoreName: 'default', strictContentTypeValidation: true },
        group: { memberNames: [makeRepoName()] },
      }
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/group/:name`, () => HttpResponse.json(repo)),
      )

      await expect(service.getRepositoriesNpmGroup(repo.name)).resolves.toEqual(repo)

      server.use(
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/group/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.getRepositoriesNpmGroup(repo.name)).resolves.toBeNull()
    })

    it('ensures an npm group, updates it', async () => {
      const repo = {
        name: makeRepoName(),
        online: true,
        storage: { blobStoreName: 'default', strictContentTypeValidation: true },
        group: { memberNames: [makeRepoName()] },
      }
      const calls: string[] = []
      server.use(
        http.post(`${nexusUrl}/service/rest/v1/repositories/npm/group`, () =>
          new HttpResponse(null, { status: HttpStatus.BAD_REQUEST, statusText: 'Repository already exists' })),
        http.get(`${nexusUrl}/service/rest/v1/repositories/npm/group/:name`, () => HttpResponse.json(repo)),
        http.put(`${nexusUrl}/service/rest/v1/repositories/npm/group/:name`, ({ request }) => {
          calls.push(request.method)
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await expect(service.ensureRepositoriesNpmGroup(repo)).resolves.toEqual(repo)
      await service.updateRepositoriesNpmGroup(repo.name, repo)

      expect(calls).toEqual(['PUT'])
    })
  })

  describe('security privileges', () => {
    const makePrivilege = () => ({
      name: makePrivilegeName(),
      description: faker.lorem.sentence(),
      actions: ['READ'],
      format: 'maven2',
      repository: makeRepoName(),
    })

    it('reads a privilege and returns null when missing', async () => {
      const privilege = makePrivilege()
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/privileges/:name`, () => HttpResponse.json(privilege)),
      )

      await expect(service.getSecurityPrivileges(privilege.name)).resolves.toEqual(privilege)

      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/privileges/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.getSecurityPrivileges(privilege.name)).resolves.toBeNull()
    })

    it('ensures a repository-view privilege, updates it, deletes it', async () => {
      const privilege = makePrivilege()
      const calls: { path: string, method: string }[] = []
      server.use(
        http.post(`${nexusUrl}/service/rest/v1/security/privileges/repository-view`, () =>
          new HttpResponse(null, { status: HttpStatus.CONFLICT })),
        http.get(`${nexusUrl}/service/rest/v1/security/privileges/:name`, () => HttpResponse.json(privilege)),
        http.put(`${nexusUrl}/service/rest/v1/security/privileges/repository-view/:name`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: 'PUT' })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
        http.delete(`${nexusUrl}/service/rest/v1/security/privileges/:name`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: 'DELETE' })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await expect(service.ensureSecurityPrivilegesRepositoryView(privilege)).resolves.toEqual(privilege)
      await service.updateSecurityPrivilegesRepositoryView(privilege.name, privilege)
      await service.deleteSecurityPrivileges(privilege.name)

      expect(calls).toEqual([
        { path: `/service/rest/v1/security/privileges/repository-view/${privilege.name}`, method: 'PUT' },
        { path: `/service/rest/v1/security/privileges/${privilege.name}`, method: 'DELETE' },
      ])
    })

    it('swallows NotFound on privilege delete', async () => {
      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/security/privileges/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )

      await expect(service.deleteSecurityPrivileges(makePrivilegeName())).resolves.toBeUndefined()
    })
  })

  describe('security roles', () => {
    it('reads a role and returns null when missing', async () => {
      const id = makeRoleId()
      const role = { id, name: id, privileges: [] }
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/roles/:id`, () => HttpResponse.json(role)),
      )

      await expect(service.getSecurityRoles(id)).resolves.toEqual(role)

      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/roles/:id`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.getSecurityRoles(id)).resolves.toBeNull()
    })

    it('updates a role and deletes it', async () => {
      const id = makeRoleId()
      const role = { id, name: id, privileges: [], description: faker.lorem.sentence() }
      const calls: { path: string, method: string }[] = []
      server.use(
        http.put(`${nexusUrl}/service/rest/v1/security/roles/:id`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: 'PUT' })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
        http.delete(`${nexusUrl}/service/rest/v1/security/roles/:id`, ({ request }) => {
          calls.push({ path: new URL(request.url).pathname, method: 'DELETE' })
          return new HttpResponse(null, { status: HttpStatus.NO_CONTENT })
        }),
      )

      await service.updateSecurityRoles(id, role)
      await service.deleteSecurityRoles(id)

      expect(calls).toEqual([
        { path: `/service/rest/v1/security/roles/${id}`, method: 'PUT' },
        { path: `/service/rest/v1/security/roles/${id}`, method: 'DELETE' },
      ])
    })

    it('swallows NotFound on role delete', async () => {
      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/security/roles/:id`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )

      await expect(service.deleteSecurityRoles(makeRoleId())).resolves.toBeUndefined()
    })
  })

  describe('security users', () => {
    it('lists users by id', async () => {
      const user = makeNexusUser()
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/users`, ({ request }) => {
          expect(new URL(request.url).searchParams.get('userId')).toBe(user.userId)
          return HttpResponse.json([{ userId: user.userId }])
        }),
      )

      await expect(service.getSecurityUsers(user.userId)).resolves.toEqual([{ userId: user.userId }])
    })

    it('returns an empty list when the query returns no data', async () => {
      server.use(
        http.get(`${nexusUrl}/service/rest/v1/security/users`, () => new HttpResponse(null, { status: HttpStatus.NO_CONTENT })),
      )

      await expect(service.getSecurityUsers(makeUserId())).resolves.toEqual([])
    })

    it('ensures a user: reloads the listing on collision', async () => {
      const user = makeNexusUser()
      server.use(
        http.post(`${nexusUrl}/service/rest/v1/security/users`, () =>
          HttpResponse.json({ errorMessage: 'User already exists' }, { status: HttpStatus.CONFLICT })),
        http.get(`${nexusUrl}/service/rest/v1/security/users`, () => HttpResponse.json([{ userId: user.userId }])),
      )

      await expect(service.ensureSecurityUsers(user)).resolves.toEqual({ userId: user.userId })
    })

    it('deletes a user and swallows NotFound', async () => {
      const userId = makeUserId()
      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/security/users/:userId`, () => new HttpResponse(null, { status: HttpStatus.NO_CONTENT })),
      )

      await expect(service.deleteSecurityUsers(userId)).resolves.toBeUndefined()

      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/security/users/:userId`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.deleteSecurityUsers(userId)).resolves.toBeUndefined()
    })
  })

  describe('repository deletion', () => {
    it('deletes a repository by name and swallows NotFound', async () => {
      const name = makeRepoName()
      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/repositories/:name`, () => new HttpResponse(null, { status: HttpStatus.NO_CONTENT })),
      )

      await expect(service.deleteRepositoriesByName(name)).resolves.toBeUndefined()

      server.use(
        http.delete(`${nexusUrl}/service/rest/v1/repositories/:name`, () => HttpResponse.json({}, { status: HttpStatus.NOT_FOUND })),
      )
      await expect(service.deleteRepositoriesByName(name)).resolves.toBeUndefined()
    })
  })
})
