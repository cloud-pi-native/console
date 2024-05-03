import prisma from '../../__mocks__/prisma.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomRole, getRandomUser } from '@cpn-console/test-utils'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath, projectServiceContract } from '@cpn-console/shared'
import { getRequestor, setRequestor } from '../../utils/mocks.js'
import app from '../../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../../utils/mocks.js')).mockSessionPlugin)
vi.mock('@cpn-console/hooks', (await import('../../utils/mocks.js')).mockHooksPackage)
vi.mock('../../utils/hook-wrapper.js', (await import('../../utils/mocks.js')).mockHookWrapper)

describe('System config routes', () => {
  const requestor = { ...getRandomUser(), groups: [] as string[] }
  setRequestor(requestor)

  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('projectServiceContract', () => {
    it('Should retrieve services config of project as member', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'owner')]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectPlugin.findMany.mockResolvedValueOnce([])
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])

      requestor.groups = []

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', project.id))
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toHaveLength(4) // no manifest to validate
    })
    it('Should retrieve services config of project as admin', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = [adminGroupPath]

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectPlugin.findMany.mockResolvedValueOnce([])
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', project.id))
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toHaveLength(4) // no manifest to validate
    })

    it('Should not retrieve services config of project', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(project)
      prisma.projectPlugin.findMany.mockResolvedValueOnce([])
      prisma.adminPlugin.findMany.mockResolvedValueOnce([])

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', project.id))
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('Should not retrieve services cause project not exist', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(undefined)

      const response = await app.inject()
        .get(projectServiceContract.getServices.path.replace(':projectId', project.id))
        .end()

      expect(response.statusCode).toEqual(404)
    })

    it('Should update config of plugins as member', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = [...project.roles, getRandomRole(getRequestor().id, project.id, 'user')]
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', project.id))
        .body({ argocd: { url: 'dhjvf' } }) // no manifest to validate it
        .end()

      expect(response.statusCode).toEqual(204)
      expect(response.body).toBe('')
    })

    it('Should update config of plugins as admin', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = [adminGroupPath]

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', project.id))
        .body({ argocd: { url: 'dhjvf' } }) // no manifest to validate it
        .end()

      expect(response.statusCode).toEqual(204)
      expect(response.body).toBe('')
    })

    it('Should not update config of plugins', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(project)

      const response = await app.inject()
        .post(projectServiceContract.updateProjectServices.path.replace(':projectId', project.id))
        .body({ argocd: { url: 'dhjvf' } }) // no manifest to validate it
        .end()

      expect(response.statusCode).toEqual(403)
    })
    it('Should not update config cause project not exist', async () => {
      const project = createRandomDbSetup({}).project
      project.roles = []
      requestor.groups = []

      prisma.project.findUnique.mockResolvedValue(undefined)

      const response = await app.inject()
        .put(projectServiceContract.getServices.path.replace(':projectId', project.id))
        .body({})
        .end()

      expect(response.statusCode).toEqual(404)
    })
  })
})
