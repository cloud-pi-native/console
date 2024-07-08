import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import prisma from '../../../__mocks__/prisma.js'
import { setRequestor } from '../../../utils/mocks.js'
import app from '../../../app.js'
import { getConnection, closeConnections } from '../../../connect.js'
import { adminGroupPath } from '@cpn-console/shared'
import { createRandomDbSetup, getRandomCluster, getRandomProject, getRandomUser, repeatFn } from '@cpn-console/test-utils'
import { json2csv } from 'json-2-csv'

vi.mock('fastify-keycloak-adapter', (await import('../../../utils/mocks.js')).mockSessionPlugin)

describe('Admin project routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  beforeEach(() => {
    const requestor = { ...getRandomUser(), groups: [adminGroupPath] }
    setRequestor(requestor)

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // GET
  describe('generateProjectsDataController', () => {
    it('Should retrieve all projects data for download', async () => {
      const projects = repeatFn(2)(getRandomProject)

      prisma.project.findMany.mockResolvedValue(projects)

      const response = await app.inject()
        .get('/api/v1/admin/projects/data')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toEqual(json2csv(projects, {
        emptyFieldValue: '',
      }))
    })
  })

  // PATCH
  describe('handleProjectLockingController', () => {
    it('Should lock a project', async () => {
      const project = getRandomProject()

      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .patch(`/api/v1/admin/projects/${project.id}`)
        .body({ lock: true })
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should unlock a project if not failed', async () => {
      const project = getRandomProject()
      project.status = 'created'

      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .patch(`/api/v1/admin/projects/${project.id}`)
        .body({ lock: false })
        .end()

      expect(response.statusCode).toEqual(200)
    })

    it('Should not unlock a project if failed', async () => {
      const project = getRandomProject()
      project.status = 'failed'

      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .patch(`/api/v1/admin/projects/${project.id}`)
        .body({ lock: false })
        .end()

      expect(response.statusCode).toEqual(200)
    })
  })
})
