import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { sessionConf } from '../utils/keycloak.js'
import ciFilesRouter from '../routes/ci-files.js'
import { closeConnections, getConnection } from '../connect.js'
import { createRandomDbSetup } from 'test-utils'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(ciFilesRouter)
}

describe.skip('ciFiles routes', () => {
  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    global.fetch = vi.fn(() => Promise.resolve())
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterAll(async () => {
    vi.clearAllMocks()
    global.fetch = vi.fn(() => Promise.resolve({ json: async () => { } }))
  })

  it('Should generate files for a node project', async () => {
    const randomDbSetup = createRandomDbSetup({})
    const ciData = {
      projectName: randomDbSetup.project.name,
      internalRepoName: randomDbSetup.project.repositories[0].internalRepoName,
      typeLanguage: 'node',
      nodeVersion: '18.1.1',
      nodeInstallCommand: 'npm install',
      nodeBuildCommand: 'npm run build',
      workingDir: '../client',
    }

    const response = await app.inject()
      .post('/')
      .body(ciData)
      .end()

    expect(response.statusCode).toEqual(201)
    expect(response.body)
      .to.contain(`IMAGE_NAME: ${ciData.projectName}`)
      .and.to.contain(`NODE_INSTALL_COMMAND: ${ciData.nodeInstallCommand}`)
  })

  it('Should generate files for a java project', async () => {
    const randomDbSetup = createRandomDbSetup({})
    const ciData = {
      projectName: randomDbSetup.project.name,
      internalRepoName: randomDbSetup.project.repositories[0].internalRepoName,
      typeLanguage: 'java',
      workingDir: '../client',
      javaVersion: '8.1.2',
      artefactDir: './',
    }

    const response = await app.inject()
      .post('/')
      .body(ciData)
      .end()

    expect(response.statusCode).toEqual(201)
    expect(response.body)
      .to.contain(`IMAGE_NAME: ${ciData.projectName}`)
      .and.to.contain(`BUILD_IMAGE_NAME: maven:3.8-openjdk-${ciData.javaVersion}`)
  })

  it('Should generate files for a python project', async () => {
    const randomDbSetup = createRandomDbSetup({})
    const ciData = {
      projectName: randomDbSetup.project.name,
      internalRepoName: randomDbSetup.project.repositories[0].internalRepoName,
      typeLanguage: 'python',
      workingDir: './',
    }

    const response = await app.inject()
      .post('/')
      .body(ciData)
      .end()

    expect(response.statusCode).toEqual(201)
    expect(response.body)
      .to.contain(`IMAGE_NAME: ${ciData.projectName}`)
  })
})
