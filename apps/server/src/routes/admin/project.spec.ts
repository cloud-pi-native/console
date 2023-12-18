import prisma from '../../__mocks__/prisma.js'
import app, { setRequestor } from '../../__mocks__/app.js'
import { vi, describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest'
import { getConnection, closeConnections } from '../../connect.js'
import { adminGroupPath } from '@dso-console/shared'
import { getRandomProject, getRandomUser, repeatFn } from '@dso-console/test-utils'

describe('Admin projects routes', () => {
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
  describe('getAllProjectsController', () => {
    it('Should retrieve all projects', async () => {
      const projects = repeatFn(2)(getRandomProject)

      prisma.project.findMany.mockResolvedValue(projects)

      const response = await app.inject()
        .get('/api/v1/admin/projects')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toMatchObject(projects)
    })

    it('Should return an error if retrieve projects failed', async () => {
      const error = { statusCode: 500, message: 'Echec de la récupération de l\'ensemble des projets' }

      prisma.project.findMany.mockRejectedValue(error)

      const response = await app.inject()
        .get('/api/v1/admin/projects')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.json().message).toEqual(error.message)
    })

    it('Should return an error if requestor is not admin', async () => {
      const requestor = getRandomUser()
      setRequestor(requestor)

      const response = await app.inject()
        .get('/api/v1/admin/projects')
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.json().message).toEqual('Vous n\'avez pas les droits administrateur')
    })
  })

  // PATCH
  describe('handleProjectLockingController', () => {
    it('Should lock a project', async () => {
      const project = getRandomProject()

      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/admin/projects/${project.id}/locking`)
        .body({ lock: true })
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should unlock a project if not failed', async () => {
      const project = getRandomProject()
      project.status = 'created'

      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/admin/projects/${project.id}/locking`)
        .body({ lock: false })
        .end()

      expect(response.statusCode).toEqual(204)
    })

    it('Should not unlock a project if failed', async () => {
      const project = getRandomProject()
      project.status = 'failed'

      prisma.environment.findMany.mockResolvedValue([])
      prisma.repository.findMany.mockResolvedValue([])
      // @ts-ignore
      prisma.project.update.mockResolvedValue(project)

      const response = await app.inject()
        .put(`/api/v1/admin/projects/${project.id}/locking`)
        .body({ lock: false })
        .end()

      expect(response.statusCode).toEqual(204)
    })
  })
})
