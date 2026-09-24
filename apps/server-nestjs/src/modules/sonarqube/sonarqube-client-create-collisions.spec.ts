import type { ConfigType } from '@nestjs/config'
import type { CreatePermissionTemplateParams, CreateUserGroupParams } from './sonarqube-client.service'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { makeSonarqubeGroup, makeSonarqubePaging } from './sonarqube-testing.utils'

const sonarUrl = 'https://sonarqube.internal'
const sonarToken = 'my-token'

const server = setupServer()

describe('sonarqubeClientService create collisions', () => {
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

  it('should resolve createUserGroup on a create race when the group already exists', async () => {
    const name = faker.internet.username()
    const existing = makeSonarqubeGroup({ name })
    let createCalls = 0
    server.use(
      http.post(`${sonarUrl}/api/user_groups/create`, () => {
        createCalls += 1
        return HttpResponse.json({ errors: [{ msg: `Group '${name}' already exists` }] }, { status: 400 })
      }),
      http.get(`${sonarUrl}/api/user_groups/search`, () =>
        HttpResponse.json({ paging: makeSonarqubePaging({ total: 1 }), groups: [existing] })),
    )

    await expect(service.createUserGroup({ name } satisfies CreateUserGroupParams)).resolves.toMatchObject({ name })
    expect(createCalls).toBe(1)
  })

  it('should resolve createPermissionTemplate on a create race when the template already exists', async () => {
    const name = 'Forge Default'
    let createCalls = 0
    server.use(
      http.post(`${sonarUrl}/api/permissions/create_template`, () => {
        createCalls += 1
        return HttpResponse.json({ errors: [{ msg: `Permission template '${name}' already exists` }] }, { status: 400 })
      }),
      http.get(`${sonarUrl}/api/permissions/search_templates`, () =>
        HttpResponse.json({ permissionTemplates: [{ id: '1', name }] })),
    )

    await expect(service.createPermissionTemplate({ name } satisfies CreatePermissionTemplateParams)).resolves.toMatchObject({ name })
    expect(createCalls).toBe(1)
  })
})
