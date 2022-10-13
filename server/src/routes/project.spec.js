import request from 'supertest'
import express from 'express'
// import { getConnection, closeConnections } from '../connect.js'
import projectRouter from './project.js'
// import { createProject } from '../models/project-queries.js'
import { createRandomProject } from '../utils/__tests__/project-util.js'
// import { repeatFn } from '../utils/__tests__/fp-util.js'
export const repeatFn = nb => fn => Array.from({ length: nb }).map(() => fn())
// import { ITEM_DELETE_SUCCESS_MESSAGE } from '../utils/messages.js'


describe('Project routes', () => {
  beforeAll(async () => {
    // await getConnection()
  })
  afterAll(async () => {
    // return closeConnections()
    return false
  })

  const app = express()
  app.use(express.json())
    .use(projectRouter)

  describe('post("/", createProjectController)', () => {
    it.skip('Should create a project', async () => {
      const project = createRandomProject()

      const response = await request(app)
        .post('/')
        // .set('Authorization', `Bearer ${token}`)
        .send(project)

      expect(response.status).toEqual(201)
      expect(response.body.project).toMatchObject(project)
    })
  })

  describe('get("/", getProjectsController)', () => {
    it.skip('Should get list of projects', async () => {
      const randomProjects = repeatFn(3)(createRandomProject)
      await Promise.all(
        randomProjects.map(async randomProject => {
          return Promise.resolve(createProject(randomProject))
        }),
      )

      const response = await request(app)
        .get('/')
      // .set('Authorization', `Bearer ${token}`)

      expect(response.status).toEqual(200)
      expect(response.body.projects).toBeDefined()
      const { projects } = response.body
      projects.forEach(project => {
        expect(project).toMatchObject(randomProjects.find(randomProject => randomProject.projectName === project.projectName))
      })
    })
  })

  describe('get("/:id", getProjectByIdController)', () => {
    it.skip('Should get a project by id', async () => {
      const randomProject = createRandomProject()
      const project = await createProject(randomProject)

      const response = await request(app)
        .get(`/${project._id}`)
        // .set('Authorization', `Bearer ${token}`)

      expect(response.status).toEqual(200)
      expect(response.body.project).toBeDefined()
      expect(response.body.project).toMatchObject(randomProject)
    })

    it.skip('Should not get a project when id is invalid', async () => {
      const response = await request(app)
        .get('/invalid')
        // .set('Authorization', `Bearer ${token}`)

      expect(response.status).toEqual(500)
      expect(response.body.project).not.toBeDefined()
      expect(response.body.message).toBeDefined()
    })
  })
})