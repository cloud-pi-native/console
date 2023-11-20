import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '@/utils/keycloak.js'
import { getConnection, closeConnections } from '@/connect.js'
import clusterRouter from './cluster.js'
import { adminGroupPath } from '@dso-console/shared'
import { User, getRandomCluster, getRandomRole, getRandomUser } from '@dso-console/test-utils'
import { checkAdminGroup } from '@/utils/controller.js'
import prisma from '@/__mocks__/prisma.js'

// @ts-ignore
vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('@/prisma.js')

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    if (req.headers.admin) {
      req.session = {
        user: {
          ...getRequestor(),
          groups: [adminGroupPath],
        },
      }
    } else {
      req.session = { user: getRequestor() }
    }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.addHook('preHandler', checkAdminGroup)
    .register(fp(mockSessionPlugin))
    .register(clusterRouter)
}

let requestor: User

const setRequestor = (user: User) => {
  requestor = user
}

const getRequestor = () => {
  return requestor
}

describe('Admin clusters routes', () => {
  const requestor = getRandomUser()
  setRequestor(requestor)

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('getClusterAssociatedEnvironmentsController', () => {
    it('Should retrieve a cluster\'s associated environments', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = [{
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(requestor.id, 'projectId', 'owner'), user: requestor },
          ],
        },
        name: 'dev-0',
      }]

      prisma.cluster.findUnique.mockResolvedValue(cluster)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .get(`/${cluster.id}/environments`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toEqual([{
        // @ts-ignore
        organization: cluster.environments[0]?.project?.organization?.name,
        // @ts-ignore
        project: cluster.environments[0]?.project?.name,
        // @ts-ignore
        name: cluster.environments[0]?.name,
        owner: requestor.email,
      }])
    })
  })

  describe('deleteClusterController', () => {
    it('Should delete a cluster', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = []

      prisma.cluster.findUnique.mockResolvedValue(cluster)
      prisma.cluster.delete.mockResolvedValueOnce(1)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not delete a cluster if environments suscribed it', async () => {
      const cluster = getRandomCluster()
      // @ts-ignore
      cluster.environments = [{
        project: {
          name: 'project0',
          organization: {
            name: 'mi',
          },
          roles: [
            { ...getRandomRole(requestor.id, 'projectId', 'owner'), user: requestor },
          ],
        },
        name: 'dev-0',
      }]

      prisma.cluster.findUnique.mockResolvedValue(cluster)

      const response = await app.inject({ headers: { admin: 'admin' } })
      // @ts-ignore
        .delete(`/${cluster.id}`)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.json().message).toEqual('Impossible de supprimer le cluster, des environnements en activité y sont déployés')
    })
  })
})
