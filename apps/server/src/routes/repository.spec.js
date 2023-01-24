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
  it.skip('', () => {

  })
})
