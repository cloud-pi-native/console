import { vi, describe, it, expect, afterEach } from 'vitest'
import { createRandomAnsibleRepo } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { sessionConf } from '../utils/keycloak.js'
import repositoryRouter from './repository.js'
import { runPlaybook } from '../ansible.js'

vi.mock('../ansible.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(repositoryRouter)

describe('Repositories routes', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createRepositoryController', () => {
    it('Should send 200 response', async () => {
      const randomAnsibleProject = createRandomAnsibleRepo()

      const response = await app.inject()
        .post('/')
        .body(randomAnsibleProject)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Provisioning repos in project with ansible started')
    })

    it('Should send 500 response if running playbook failed', async () => {
      const randomAnsibleProject = createRandomAnsibleRepo()

      const error = new Error('This is OK!')
      runPlaybook.mockImplementationOnce(() => { throw error })

      const response = await app.inject()
        .post('/')
        .body(randomAnsibleProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Provisioning repos in project with ansible failed')
    })
  })
})
