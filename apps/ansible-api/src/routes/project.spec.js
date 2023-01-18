import { vi, describe, it, expect, afterEach } from 'vitest'
import { createRandomAnsibleProject } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import { sessionConf } from '../utils/keycloak.js'
import projectRouter from './project.js'
import { runPlaybook } from '../ansible.js'

vi.mock('../ansible.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)
  .register(projectRouter)

describe('Project routes', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createProjectController', () => {
    it('Should send 201 response', async () => {
      const randomAnsibleProject = createRandomAnsibleProject()

      const response = await app.inject()
        .post('/')
        .body(randomAnsibleProject)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Provisioning project with ansible started')
    })

    it('Should send 500 response if running playbook failed', async () => {
      const randomAnsibleProject = createRandomAnsibleProject()

      const error = new Error('This is OK!')
      runPlaybook.mockImplementationOnce(() => { throw error })

      const response = await app.inject()
        .post('/')
        .body(randomAnsibleProject)
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Provisioning project with ansible failed')
    })
  })
})
