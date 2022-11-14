import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { nanoid } from 'nanoid'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections, sequelize } from '../connect.js'
import { getProjectModel } from '../models/project.js'
import projectRouter from './project.js'
import { createRandomProject } from '../utils/__tests__/project-util.js'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
vi.mock('../utils/ansible.js', () => ({ projectProvisioning: vi.fn() }))

export const repeatFn = nb => fn => Array.from({ length: nb }).map(() => fn())

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getOwner() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(projectRouter)
}

let owner
const setOwner = (givenOwner) => {
  owner = givenOwner
}

const getOwner = () => {
  return owner
}

describe('Project routes', () => {
  let Project
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
  })
  afterAll(async () => {
    return closeConnections()
  })
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('post("/", createProjectController)', () => {
    it('Should create a project', async () => {
      const randomProject = createRandomProject()

      Project.$queueResult(null)
      Project.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomProject)
    })

    it('Should not create a project if payload is invalid', async () => {
      const randomProject = createRandomProject()
      delete randomProject.email

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
    })

    it('Should not create a project if projectName already exists', async () => {
      const randomProject = createRandomProject()

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('put("/", updateProjectController)', () => {
    it('Should update a project', async () => {
      const randomProject = { ...createRandomProject(), id: nanoid() }

      sequelize.$queueResult({ data: randomProject })
      sequelize.$queueResult(randomProject)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .put(`/${randomProject.id}`)
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject({ data: `Project ${randomProject.id} updated` })
    })

    it('Should not update a project if permission is missing', async () => {
      const randomProject = createRandomProject()

      Project.$queueResult(null)
      setOwner(randomProject.owner)

      const response = await app.inject()
        .put('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(500)
    })
  })

  describe('get("/", getUserProjectsController)', () => {
    it('Should get list of a user\'s projects', async () => {
      const randomProjects = repeatFn(3)(createRandomProject)

      sequelize.$queueResult(randomProjects.map(randomProject => ({ data: randomProject })))
      setOwner(randomProjects[0].owner)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      const data = response.json()
      data.forEach(project => {
        expect(project).toMatchObject(randomProjects.find(randomProject => randomProject.projectName === project.projectName))
      })
    })

    it('Should return an error while get list of projects', async () => {
      const errorMessage = 'error message'
      sequelize.$queueFailure(errorMessage)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(errorMessage)
    })
  })

  describe('get("/:id", getUserProjectByIdController)', () => {
    it('Should get a project by id', async () => {
      const randomProject = createRandomProject()

      sequelize.$queueResult({ data: randomProject })
      setOwner(randomProject.owner)

      const response = await app.inject()
        .get(`/${randomProject.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomProject)
    })

    it('Should not get a project when id is invalid', async () => {
      const errorMessage = 'error message'
      sequelize.$queueFailure(errorMessage)

      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(500)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual(errorMessage)
    })
  })
})
