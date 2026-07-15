import { faker } from '@faker-js/faker'
import { HttpStatus } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { ConfigurationService } from '../infrastructure/configuration/configuration.service'
import { VaultClientService } from '../vault/vault-client.service'
import { RegistryClientService } from './registry-client.service'
import { RegistryHttpClientService } from './registry-http-client.service'

const harborUrl = 'https://harbor.example'
const harborAdminPassword = faker.internet.password()
const basicAuth = `Basic ${Buffer.from(`admin:${harborAdminPassword}`, 'utf8').toString('base64')}`

const server = setupServer()

describe('registryService', () => {
  let service: RegistryClientService

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    const config = mockDeep<ConfigurationService>({
      harborUrl,
      harborInternalUrl: harborUrl,
      harborAdmin: 'admin',
      harborAdminPassword,
      harborRuleTemplate: 'latestPushedK',
      harborRuleCount: '10',
      harborRetentionCron: '0 22 2 * * *',
      projectRootDir: 'forge',
    })

    const module = await Test.createTestingModule({
      providers: [
        RegistryClientService,
        RegistryHttpClientService,
        {
          provide: VaultClientService,
          useValue: {},
        },
        {
          provide: ConfigurationService,
          useValue: config,
        },
      ],
    }).compile()
    service = module.get(RegistryClientService)
  })

  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  it('should send basic auth and JSON body on createProject', async () => {
    server.use(
      http.post(`${harborUrl}/api/v2.0/projects`, async ({ request }) => {
        expect(request.method).toBe('POST')
        expect(request.url).toBe(`${harborUrl}/api/v2.0/projects`)
        expect(request.headers.get('accept')).toBe('application/json')
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(request.headers.get('content-type')).toContain('application/json')
        expect(await request.json()).toEqual({
          project_name: 'myproj',
          metadata: { auto_scan: 'true' },
          storage_limit: -1,
        })
        return HttpResponse.json({}, { status: HttpStatus.CREATED })
      }),
    )

    await service.createProject('myproj', -1)
  })

  it('should send X-Is-Resource-Name on getProjectByName', async () => {
    server.use(
      http.get(`${harborUrl}/api/v2.0/projects/:projectName`, async ({ request, params }) => {
        expect(request.method).toBe('GET')
        expect(request.headers.get('authorization')).toBe(basicAuth)
        expect(request.headers.get('x-is-resource-name')).toBe('true')
        expect(params.projectName).toBe('myproj')
        return HttpResponse.json({ project_id: 123, metadata: {} })
      }),
    )

    const res = await service.getProjectByName('myproj')

    expect(res).toMatchObject({ status: HttpStatus.OK, data: { project_id: 123 } })
  })
})
