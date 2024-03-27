import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeConnections, getConnection } from '../connect.js'
import { createRandomDbSetup } from '@cpn-console/test-utils'
import app from '../app.js'

vi.mock('fastify-keycloak-adapter', (await import('../utils/mocks.js')).mockSessionPlugin)
vi.mock('../prisma.js')

describe('ciFiles routes', () => {
  beforeAll(async () => {
    await getConnection()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterAll(async () => {
    vi.clearAllMocks()
  })

  it('Should generate files for a node project', async () => {
    const randomDbSetup = createRandomDbSetup({})
    const ciData = {
      projectName: randomDbSetup.project.name,
      internalRepoName:
        randomDbSetup.project.repositories[0].internalRepoName,
      typeLanguage: 'node',
      nodeVersion: '18.1.1',
      nodeInstallCommand: 'npm install',
      nodeBuildCommand: 'npm run build',
      workingDir: '../client',
    }

    const response = await app.inject()
      .post('/api/v1/ci-files')
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
      .post('/api/v1/ci-files')
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
      .post('/api/v1/ci-files')
      .body(ciData)
      .end()

    expect(response.statusCode).toEqual(201)
    expect(response.body)
      .to.contain(`IMAGE_NAME: ${ciData.projectName}`)
  })
})
