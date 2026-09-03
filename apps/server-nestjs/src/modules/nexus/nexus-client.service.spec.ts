import type { ConfigType } from '@nestjs/config'
import { faker } from '@faker-js/faker'
import { Test } from '@nestjs/testing'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { nexusConfigFactory } from '../../config/nexus.config'
import { NexusClientService } from './nexus-client.service'
import { NexusHttpClientService } from './nexus-http-client.service'
import { makeNexusDb, makeNexusHandlers, NEXUS_INTERNAL_URL } from './nexus-testing.utils'

const server = setupServer()
const nexusAdminPassword = faker.internet.password()

describe('nexusClientService', () => {
  let service: NexusClientService
  let db: ReturnType<typeof makeNexusDb>

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

  beforeEach(async () => {
    db = makeNexusDb()
    server.use(...makeNexusHandlers(db))

    const config = mockDeep<ConfigType<typeof nexusConfigFactory>>({
      internalUrl: NEXUS_INTERNAL_URL,
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

  it('should return null on missing repository (getRepositoriesMavenHosted)', async () => {
    await expect(service.getRepositoriesMavenHosted('missing')).resolves.toBeNull()
  })

  it('should read and create repositories through the fake nexus', async () => {
    await db.mavenHosted.create({
      name: 'maven-existing',
      online: true,
      storage: { blobStoreName: 'default', strictContentTypeValidation: true, writePolicy: 'ALLOW' },
      component: { proprietaryComponents: false },
      maven: { versionPolicy: 'RELEASE', layoutPolicy: 'PERMISSIVE', contentDisposition: 'ATTACHMENT' },
    })

    await expect(service.getRepositoriesMavenHosted('maven-existing')).resolves.toMatchObject({ name: 'maven-existing' })

    await service.createRepositoriesNpmHosted({
      name: 'npm-hosted-new',
      online: true,
      storage: { blobStoreName: 'default', strictContentTypeValidation: true, writePolicy: 'ALLOW' },
      cleanup: { policyNames: [] },
      component: { proprietaryComponents: false },
    })

    await expect(service.getRepositoriesNpmHosted('npm-hosted-new')).resolves.toMatchObject({ name: 'npm-hosted-new' })
  })

  it('should accept a change-password call', async () => {
    await service.updateSecurityUsersChangePassword('u1', 'pw123')
  })
})
