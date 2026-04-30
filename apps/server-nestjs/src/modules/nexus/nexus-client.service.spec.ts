import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { NexusClientService } from './nexus-client.service'
import { NexusHttpClientService } from './nexus-http-client.service'

const nexusUrl = 'https://nexus.internal'

const server = setupServer()
const nexusAdminPassword = faker.internet.password()
const basicAuth = `Basic ${Buffer.from(`admin:${nexusAdminPassword}`, 'utf8').toString('base64')}`

function createNexusServiceTestingModule() {
  return Test.createTestingModule({
    providers: [
      NexusClientService,
      NexusHttpClientService,
      {
        provide: ConfigurationService,
        useValue: {
          nexusSecretExposedUrl: 'https://nexus.example',
          nexusInternalUrl: nexusUrl,
          nexusAdmin: 'admin',
          nexusAdminPassword,
          projectRootDir: 'forge',
        } satisfies Partial<ConfigurationService>,
      },
    ],
  })
}

describe('nexusClientService', () => {
  let service: NexusClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const module = await createNexusServiceTestingModule().compile()
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
        return HttpResponse.json({}, { status: 404 })
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
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await service.updateSecurityUsersChangePassword('u1', 'pw123')
  })
})
