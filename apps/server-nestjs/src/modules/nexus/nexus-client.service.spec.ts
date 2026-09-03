import type { ConfigType } from '@nestjs/config'
import type { DeepMockProxy } from 'vitest-mock-extended'
import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { nexusConfigFactory } from '../../config/nexus.config'
import { NexusClientService } from './nexus-client.service'
import { NexusHttpClientService } from './nexus-http-client.service'

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
})
