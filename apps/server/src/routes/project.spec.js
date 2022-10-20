import fastify from 'fastify'
import { vi } from 'vitest'
import { getConnection, closeConnections } from '../connect.js'
import projectRouter from './project.js'
import { createProject } from '../models/project-queries.js'
import { createRandomProject } from '../utils/__tests__/project-util.js'

export const repeatFn = nb => fn => Array.from({ length: nb }).map(() => fn())

const app = fastify({ logger: false }).register(projectRouter)

let randomProjects, randomProject

vi.mock('../connect.js', () => ({
  getConnection: vi.fn(() => Promise.resolve()),
  closeConnections: vi.fn(() => Promise.resolve()),
}))

vi.mock('../models/project.js', () => ({
  sequelize: vi.fn(() => ({
    authenticate: vi.fn(),
    define: vi.fn(),
  })),
  default: vi.fn(() => ({
    create: vi.fn(() => {
      return randomProjects || randomProject
    }),
    findAll: vi.fn(() => {
      return randomProjects
    }),
    findOne: vi.fn(() => {
      return randomProject
    }),
  })),
}))

describe('Project routes', () => {
  beforeAll(async () => {
    await getConnection()
  })
  afterAll(async () => {
    return closeConnections()
  })
  beforeEach(() => {
    randomProjects = undefined
    randomProject = undefined
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('post("/", createProjectController)', () => {
    it('Should create a project', async () => {
      randomProject = createRandomProject()

      const response = await app.inject()
        .post('/')
        .body(randomProject)
        .end()

      expect(response.statusCode).toEqual(201)
      expect(JSON.parse(response.body)).toMatchObject(randomProject)
    })
  })

  describe('get("/", getProjectsController)', () => {
    it('Should get list of projects', async () => {
      randomProjects = repeatFn(3)(createRandomProject)
      await Promise.all(
        randomProjects.map(async randomProject => {
          return Promise.resolve(createProject(randomProject))
        }),
      )

      const response = await app.inject()
        .get('/')
        .end()
      // .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(JSON.parse(response.body)).toBeDefined()
      const data = JSON.parse(response.body)
      data.forEach(project => {
        expect(project).toMatchObject(randomProjects.find(randomProject => randomProject.projectName === project.projectName))
      })
    })
  })

  describe('get("/:id", getProjectByIdController)', () => {
    it('Should get a project by id', async () => {
      randomProject = createRandomProject()
      const project = await createProject(randomProject)

      const response = await app.inject()
        .get(`/${project.id}`)
        .end()
        // .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(200)
      expect(JSON.parse(response.body)).toBeDefined()
      expect(JSON.parse(response.body)).toMatchObject(randomProject)
    })

    it.skip('Should not get a project when id is invalid', async () => {
      const response = await app.inject()
        .get('/invalid')
        .end()
        // .set('Authorization', `Bearer ${token}`)

      expect(response.statusCode).toEqual(500)
      expect(response.body.data).not.toBeDefined()
      expect(response.body.message).toBeDefined()
    })
  })
})
