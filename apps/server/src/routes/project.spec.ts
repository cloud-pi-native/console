import { vi, describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { createRandomDbSetup, getRandomUser } from 'test-utils'
import fastify from 'fastify'
import fastifySession from '@fastify/session'
import fastifyCookie from '@fastify/cookie'
import fp from 'fastify-plugin'
import { faker } from '@faker-js/faker'
import { sessionConf } from '../utils/keycloak.js'
import { getConnection, closeConnections } from '../connect.js'
import projectRouter from './project.js'
import { getProjectModel } from '../models/project.js'
import { getUserModel } from '../models/user.js'
import { getUsersProjectsModel } from '../models/users-projects.js'
import { getRepositoryModel } from '../models/repository.js'
import { getEnvironmentModel } from '../models/environment.js'
import { getPermissionModel } from '../models/permission.js'
import { getOrganizationModel } from '../models/organization.js'
import { descriptionMaxLength, projectIsLockedInfo } from 'shared'
import { sequelize } from '../../vitest-init'

vi.mock('fastify-keycloak-adapter', () => ({ default: fp(async () => vi.fn()) }))

const app = fastify({ logger: false })
  .register(fastifyCookie)
  .register(fastifySession, sessionConf)

const mockSessionPlugin = (app, opt, next) => {
  app.addHook('onRequest', (req, res, next) => {
    req.session = { user: getRequestor() }
    next()
  })
  next()
}

const mockSession = (app) => {
  app.register(fp(mockSessionPlugin))
    .register(projectRouter)
}

const requestor = {}
const setRequestorId = (id) => {
  requestor.id = id
}

const getRequestor = () => {
  return requestor
}

describe('Project routes', () => {
  let Project
  let User
  let Role
  let Repository
  let Environment
  let Permissions
  let Organization

  beforeAll(async () => {
    mockSession(app)
    await getConnection()
    Project = getProjectModel()
    User = getUserModel()
    Role = getUsersProjectsModel()
    Repository = getRepositoryModel()
    Environment = getEnvironmentModel()
    Permissions = getPermissionModel()
    Organization = getOrganizationModel()
  })

  afterAll(async () => {
    return closeConnections()
  })

  afterEach(() => {
    vi.clearAllMocks()
    sequelize.$clearQueue()
    Project.$clearQueue()
    User.$clearQueue()
    Role.$clearQueue()
    Repository.$clearQueue()
    Environment.$clearQueue()
    Permissions.$clearQueue()
    Organization.$clearQueue()
    Role.$clearQueue()
  })

  // GET
  describe('getUserProjectsController', () => {
    it.skip('Should get list of a user\'s projects', async () => {
      // TODO : user.getProjects is not a function
      const randomDbSetups = [createRandomDbSetup({}), createRandomDbSetup({}), createRandomDbSetup({})]
      const randomUser = getRandomUser()
      randomDbSetups.forEach(setup => {
        setup.project.users[0].id = randomUser.id
      })
      const projects = randomDbSetups.map(project => project)

      User.$queueResult(randomUser)
      Project.$queueResult(projects)
      setRequestorId(randomDbSetups[0].project.users[0].id)

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(projects)
    })

    it('Should return an error while get list of projects', async () => {
      sequelize.$queueFailure('error message')

      const response = await app.inject()
        .get('/')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la récupération des projets de l\'utilisateur')
    })
  })

  describe('getProjectByIdController', () => {
    it('Should get a project by id', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(randomDbSetup.project.users[0])
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not retreive a project when id is invalid', async () => {
      Project.$queueFailure('custom error message')

      const response = await app.inject()
        .get('/invalid')
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de récupération du projet de l\'utilisateur')
    })

    it('Should not retreive a project when not project member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setRequestorId(owner.id)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(404)
      expect(response.body.json).not.toBeDefined()
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de récupération du projet de l\'utilisateur')
    })
  })

  describe('getProjectOwnerController', () => {
    it('Should retreive owner of a project', async () => {
      const randomDbSetup = createRandomDbSetup({ nbUsers: 2 })
      const ownerId = randomDbSetup.project.users.find(user => user.role === 'owner').id
      const owner = randomDbSetup.users.find(user => user.id === ownerId)

      // getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      // getOwnerId
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      User.$queueResult(owner)
      setRequestorId(ownerId)

      const response = await app.inject()
        .get(`/${randomDbSetup.project.id}/owner`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.json()).toBeDefined()
      expect(response.json()).toEqual(owner)
    })
  })

  // POST
  describe('createProjectController', () => {
    it.skip('Should create a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project.id
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // get user
      User.$queueResult(owner)

      // validate project schema
      sequelize.$queueResult(true)

      // checkUniqueProject
      Project.$queueResult(null)

      // initialize project and lock
      Project.$queueResult(randomDbSetup.project)
      Project.$queueResult([1])

      // add user to project
      Role.$queueResult({ UserId: owner.id, role: 'owner' })

      // initialize environment
      Environment.$queueResult(randomDbSetup.project.environments[0])

      // get organization
      Organization.$queueResult(randomDbSetup.organization)

      // add logs
      sequelize.$queueResult(null)

      // 4. updateProjectStatus
      sequelize.$queueResult([1])
      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      randomDbSetup.project.status = 'initializing'
      randomDbSetup.project.locked = true
      // TODO : user.addProject is not a function
      // ok en local donc pb avec bibliothèque
      expect(response.statusCode).toEqual(201)
      expect(response.json()).toBeDefined()
      expect(response.json()).toMatchObject(randomDbSetup.project)
    })

    it('Should not create a project if payload is invalid', async () => {
      const removedKey = 'organization'
      const randomDbSetup = createRandomDbSetup({})
      delete randomDbSetup.project[removedKey]

      // get user
      User.$queueResult(randomDbSetup.users[0])

      // validate project schema
      sequelize.$queueResult(true)

      const response = await app.inject()
        .post('/')
        .body(randomDbSetup.project)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })

    it('Should not create a project if name already exists', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      const newProject = randomDbSetup.project
      delete newProject.id
      delete newProject.users
      delete newProject.repositories
      delete newProject.environments

      // get user
      User.$queueResult(owner)

      // validate project schema
      sequelize.$queueResult(true)

      // checkUniqueProject
      Project.$queueResult(randomDbSetup.project)
      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(newProject)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })

    it('Should not create a project if name exists in archives', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')
      const newProject = randomDbSetup.project
      newProject.status = 'archived'
      delete newProject.id
      delete newProject.users
      delete newProject.repositories
      delete newProject.environments

      // get user
      User.$queueResult(owner)

      // validate project schema
      sequelize.$queueResult(true)

      // checkUniqueProject
      Project.$queueResult(randomDbSetup.project)
      setRequestorId(owner.id)

      const response = await app.inject()
        .post('/')
        .body(newProject)
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toBeDefined()
      expect(response.body).toEqual('Echec de la création du projet')
    })
  })

  // PUT
  describe('updateProjectController', () => {
    it('Should update a project description', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const project = Project.build(randomDbSetup.project)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getProjectById
      Project.$queueResult(project)
      // 2. getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      // Retreive organization
      Organization.$queueResult(randomDbSetup.organization)
      // 3. projectLocked
      Project.$queueResult(project.id)
      // 4. updating
      Project.$queueResult(project.id)
      // 5. projectUnlocked
      Project.$queueResult(project.id)
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toMatchObject(`${project.id}`)
    })

    it('Should not update a project description if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setRequestorId(randomUser.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour du projet')
    })

    it('Should not update a project description if description is invalid', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const project = Project.build(randomDbSetup.project)
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      Project.$queueResult(project)
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      Organization.$queueResult(randomDbSetup.organization)
      setRequestorId(owner.id)

      const response = await app.inject()
        .put(`/${project.id}`)
        .body({ description: faker.string.alpha(descriptionMaxLength + 1) })
        .end()

      expect(response.statusCode).toEqual(400)
      expect(response.body).toEqual('Echec de la mise à jour du projet')
    })

    it('Should not update a project if locked', async () => {
      const randomDbSetup = createRandomDbSetup({})
      randomDbSetup.project.locked = true
      const randomUser = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      setRequestorId(randomUser.id)

      const response = await app.inject()
        .put(`/${randomDbSetup.project.id}`)
        .body({ description: 'nouvelle description' })
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual(projectIsLockedInfo)
    })
  })

  // DELETE
  describe('archiveProjectController', () => {
    it('Should archive a project', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const owner = randomDbSetup.project.users.find(user => user.role === 'owner')

      // 1. getProjectById
      Project.$queueResult(randomDbSetup.project)
      // 2. getRequestorRole
      Role.$queueResult({ UserId: owner.id, role: owner.role })
      // retrieve associated data
      Repository.$queueResult(randomDbSetup.project.repositories)
      Environment.$queueResult(randomDbSetup.project.environments)
      randomDbSetup.project.environments.forEach(environment => Permissions.$queueResult(environment.permissions))
      Role.$queueResult(randomDbSetup.project.users)
      // 3. projectLocked
      Project.$queueResult(randomDbSetup.project.id)
      // 4. deleting
      randomDbSetup.project.repositories.forEach(repository => Repository.$queueResult(repository))
      randomDbSetup.project.environments.forEach(environment => Environment.$queueResult(environment))
      setRequestorId(owner.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(200)
      expect(response.body).toBeDefined()
      expect(response.body).toMatchObject(`${randomDbSetup.project.id}`)
    })

    it('Should not archive a project if requestor is not member', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const randomUser = getRandomUser()

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult(null)
      setRequestorId(randomUser.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression du projet')
    })

    it('Should not archive a project if requestor is not owner', async () => {
      const randomDbSetup = createRandomDbSetup({})
      const requestor = randomDbSetup.project.users[0]
      requestor.role = 'user'

      Project.$queueResult(randomDbSetup.project)
      Role.$queueResult({ UserId: requestor.id, role: requestor.role })
      setRequestorId(requestor.id)

      const response = await app.inject()
        .delete(`/${randomDbSetup.project.id}`)
        .end()

      expect(response.statusCode).toEqual(403)
      expect(response.body).toEqual('Echec de la suppression du projet')
    })
  })
})
