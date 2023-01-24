// import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { describe, it } from 'vitest'
// import { createRandomDbSetup, getRandomUser, repeatFn } from 'test-utils'
// import fastify from 'fastify'
// import fastifySession from '@fastify/session'
// import fastifyCookie from '@fastify/cookie'
// import fp from 'fastify-plugin'
// import { nanoid } from 'nanoid'
// import { sessionConf } from '../utils/keycloak.js'
// import { getConnection, closeConnections, sequelize } from '../connect.js'
// import { getProjectModel } from '../models/project.js'
// import projectRouter from './project.js'
// import { getUserModel } from '../models/user.js'

// vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))
// vi.mock('../ansible.js')

// const app = fastify({ logger: false })
//   .register(fastifyCookie)
//   .register(fastifySession, sessionConf)

// const mockSessionPlugin = (app, opt, next) => {
//   app.addHook('onRequest', (req, res, next) => {
//     req.session = { user: getOwner() }
//     next()
//   })
//   next()
// }

// const mockSession = (app) => {
//   app.register(fp(mockSessionPlugin))
//     .register(projectRouter)
// }

// const owner = {}
// const setOwnerId = (id) => {
//   owner.id = id
// }

// const getOwner = () => {
//   return owner
// }

// describe('Project routes', () => {
//   let Project
//   let User

//   beforeAll(async () => {
//     mockSession(app)
//     await getConnection()
//     Project = getProjectModel()
//     User = getUserModel()
//     global.fetch = vi.fn(() => Promise.resolve())
//   })

//   afterAll(async () => {
//     return closeConnections()
//   })

//   afterEach(() => {
//     vi.clearAllMocks()
//     sequelize.$clearQueue()
//     global.fetch = vi.fn(() => Promise.resolve())
//   })

describe('', () => {
  it('', () => {

  })
  // describe('addRepoController', () => {
  //   it.skip('Should add a repo in project', async () => {
  //     const randomDbSetup = createRandomDbSetup({})
  //     const randomRepo = randomDbSetup.repositories[0]

  //     // first query : getUserProjectById
  //     sequelize.$queueResult({ data: randomDbSetup })
  //     // second query : addRepo
  //     Project.$queueResult([1])
  //     // third query : getUserProjectById
  //     sequelize.$queueResult({ data: randomDbSetup })
  //     // fourth query : updateProjectStatus
  //     Project.$queueResult([1])
  //     setOwnerId(randomDbSetup.owner)

  //     const response = await app.inject()
  //       .post(`/${randomDbSetup.id}/repos`)
  //       .body(randomRepo)
  //       .end()

  //     expect(response.statusCode).toEqual(201)
  //     expect(response.body).toBeDefined()
  //     expect(response.body).toEqual('Git repository successfully added into project')
  //   })

  //   it.skip('Should not add a repo if internalRepoName already present', async () => {
  //     const randomDbSetup = { ...createRandomDbSetup({}), id: nanoid(), locked: false }
  //     const randomRepo = randomDbSetup.repos[0]

  //     sequelize.$queueResult({ data: randomDbSetup })
  //     Project.$queueResult([1])
  //     sequelize.$queueResult({ data: randomDbSetup })
  //     Project.$queueResult([1])
  //     setOwnerId(randomDbSetup.owner)

  //     const response = await app.inject()
  //       .post(`/${randomDbSetup.id}/repos`)
  //       .body(randomRepo)
  //       .end()

  //     expect(response.statusCode).toEqual(500)
  //     expect(response.body).toBeDefined()
  //     expect(response.body).toEqual(`Cannot add git repository into project: Git repo '${randomRepo.internalRepoName}' already exists in project`)
  //   })

  //   it.skip('Should not add a repo if permission is missing', async () => {
  //     const randomDbSetup = createRandomDbSetup({})

  //     sequelize.$queueResult(null)
  //     setOwnerId(randomDbSetup.owner)

  //     const response = await app.inject()
  //       .post(`/${randomDbSetup.id}/repos`)
  //       .body(randomDbSetup)
  //       .end()

  //     expect(response.statusCode).toEqual(500)
  //     expect(response.body).toBeDefined()
  //     expect(response.body).toEqual('Missing permissions on this project')
  //   })
  // })
})
