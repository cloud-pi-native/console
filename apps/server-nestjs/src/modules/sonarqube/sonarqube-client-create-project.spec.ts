import type { ConfigType } from '@nestjs/config'
import type { CreateProjectParams } from './sonarqube-client.service'
import { Test } from '@nestjs/testing'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mockDeep } from 'vitest-mock-extended'
import { sonarqubeConfigFactory } from '../../config/sonarqube.config'
import { SonarqubeClientService } from './sonarqube-client.service'
import { SonarqubeHttpClientService } from './sonarqube-http-client.service'
import { makeSonarqubePaging, makeSonarqubeProject } from './sonarqube-testing.utils'

const sonarUrl = 'https://sonarqube.internal'
const sonarToken = 'my-token'
const sonarAuthHeader = `Bearer ${sonarToken}`

const server = setupServer()

describe('sonarqubeClientService createProject', () => {
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

  it('should POST projects/create with all params as query string', async () => {
    const params = {
      project: 'proj-repo-910b',
      visibility: 'private',
      name: 'proj-repo',
      mainbranch: 'main',
    } satisfies CreateProjectParams
    server.use(
      http.post(`${sonarUrl}/api/projects/create`, ({ request }) => {
        const query = new URL(request.url).searchParams
        expect(query.get('project')).toBe(params.project)
        expect(query.get('name')).toBe(params.name)
        expect(query.get('mainbranch')).toBe(params.mainbranch)
        expect(request.headers.get('authorization')).toBe(sonarAuthHeader)
        return HttpResponse.json({ project: makeSonarqubeProject({ key: params.project }) })
      }),
    )
    await expect(service.createProject(params)).resolves.not.toThrow()
  })

  it('should resolve on a create race when the project already exists (400 similar key)', async () => {
    const key = 'persistence-toto-910b'
    let createCalls = 0
    server.use(
      http.post(`${sonarUrl}/api/projects/create`, () => {
        createCalls += 1
        return HttpResponse.json({ errors: [{ msg: `Could not create Project with key: "${key}". A similar key already exists: "${key}"` }] }, { status: 400 })
      }),
      http.get(`${sonarUrl}/api/projects/search`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('q')).toBe(key)
        return HttpResponse.json({ paging: makeSonarqubePaging({ total: 1 }), components: [makeSonarqubeProject({ key })] })
      }),
    )

    await expect(service.createProject({
      project: key,
      visibility: 'private',
      name: key,
      mainbranch: 'main',
    })).resolves.not.toThrow()

    expect(createCalls).toBe(1)
  })

  it('should rethrow when the create fails for a non-collision reason', async () => {
    server.use(
      http.post(`${sonarUrl}/api/projects/create`, () => HttpResponse.json({ errors: [{ msg: 'forbidden' }] }, { status: 403 })),
    )
    await expect(service.createProject({
      project: 'proj-repo-910b',
      visibility: 'private',
      name: 'proj-repo',
      mainbranch: 'main',
    })).rejects.toThrow()
  })
})
