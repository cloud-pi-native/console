import {
  getUserProjects,
  getProject,
  initializeProject,
  updateProjectCreated,
  updateProjectFailed,
  getProjectById,
  lockProject,
  unlockProject,
  addUserToProject,
  archiveProject,
  getProjectUsers,
} from '../models/queries/project-queries.js'
import { getOrCreateUser, getUserById } from '../models/queries/user-queries.js'
import {
  deleteRoleByUserIdAndProjectId,
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import {
  getProjectRepositories,
  deleteRepository,
  updateRepositoryDeleting,
} from '../models/queries/repository-queries.js'
import {
  deleteEnvironment,
  getEnvironmentsByProjectId,
  updateEnvironmentDeleting,
  initializeEnvironment,
  updateEnvironmentCreated,
} from '../models/queries/environment-queries.js'
import {
  getEnvironmentPermissions,
  deletePermissionById,
  setPermission,
} from '../models/queries/permission-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { replaceNestedKeys, lowercaseFirstLetter } from '../utils/queries-tools.js'
import { addLogs } from '../models/queries/log-queries.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const requestor = req.session?.user

  try {
    const user = await getOrCreateUser(requestor)
    if (!user) return send200(res, [])

    let projects = await getUserProjects(user)
    req.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retreived',
    })
    if (!projects.length) return send200(res, [])

    projects = projects.filter(project => project.status !== 'archived')
    projects.map(project => replaceNestedKeys(project, lowercaseFirstLetter))
    return send200(res, projects)
  } catch (error) {
    const message = `Cannot retrieve projects: ${error?.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error?.message,
    })
    send500(res, message)
  }
}

export const getProjectByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const project = await getProjectById(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    const message = `Cannot retrieve project: ${error?.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error?.message,
    })
    send500(res, message)
  }
}

export const getProjectOwnerController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const ownerId = await getSingleOwnerByProjectId(projectId)
    const owner = await getUserById(ownerId)

    req.log.info({
      ...getLogInfos({ owner }),
      description: 'Project owner successfully retrived',
    })
    send200(res, owner)
  } catch (error) {
    const message = `Cannot retrieve project: ${error?.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error?.message,
    })
    send500(res, message)
  }
}

// POST
export const createProjectController = async (req, res) => {
  const data = req.body
  const user = req.session?.user

  let project
  let environment
  let owner

  try {
    owner = await getOrCreateUser({ id: user.id, email: user?.email, firstName: user?.firstName, lastName: user?.lastName })

    await projectSchema.validateAsync(data)

    project = await getProject({ name: data.name, organization: data.organization })
    if (project?.archived) throw new Error(`"${data.name}" est archivé et n'est plus disponible`)
    if (project) throw new Error(`"${data.name}" existe déjà`)

    project = await initializeProject(data)
    await lockProject(project.id)

    await addUserToProject({ project, user: owner, role: 'owner' })

    environment = await initializeEnvironment({ name: 'dev', projectId: project.id })

    req.log.info({
      ...getLogInfos({
        projectId: project.id,
      }),
      description: 'Project successfully created in database',
    })
    send201(res, project)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Cannot create project: ${error?.message}`,
      error: error?.message,
    })
    return send500(res, error?.message)
  }

  try {
    const organization = await getOrganizationById(project.organization)

    const ansibleData = {
      PROJECT_NAME: project.name,
      ORGANIZATION_NAME: organization.name,
      EMAIL: owner.dataValues.email,
      ENV_LIST: [environment.name],
    }
    const ansibleRes = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
      body: JSON.stringify(ansibleData),
    })
    const resJson = await ansibleRes.json()
    await addLogs(resJson, owner.dataValues.id)
    if (resJson?.status !== 'OK') throw new Error('Echec de création du projet côté ansible')
    try {
      await updateEnvironmentCreated(environment.id)
      await setPermission({
        userId: owner.id,
        environmentId: environment.id,
        level: 2,
      })
      await updateProjectCreated(project.id)
      await unlockProject(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to created',
        error: error?.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error?.message}`,
      error,
    })
    try {
      await updateProjectFailed(project.id)
      await unlockProject(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to failed',
        error: error?.message,
      })
    }
  }
}

// DELETE
export const archiveProjectController = async (req, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId

  let repos
  let environments
  const permissions = []
  let users
  let project
  try {
    project = await getProjectById(projectId)
    if (!project) throw new Error('Projet introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    repos = await getProjectRepositories(projectId)
    environments = await getEnvironmentsByProjectId(projectId)
    environments?.forEach(async environment => {
      const envPerms = await getEnvironmentPermissions(environment?.id)
      permissions.push(...envPerms)
    })
    users = await getProjectUsers(projectId)

    await lockProject(projectId)
    repos?.forEach(async repo => {
      await updateRepositoryDeleting(repo.id)
    })
    environments?.forEach(async environment => {
      await updateEnvironmentDeleting(environment.id)
    })
    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Project successfully locked in database',
    })
    send200(res, projectId)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Cannot lock project: ${error?.message}`,
      error: error?.message,
    })
    return send500(res, error?.message)
  }

  try {
    const organization = await getOrganizationById(project.organization)

    const ansibleData = {
      ORGANIZATION_NAME: organization.name,
      ENV_LIST: environments.map(environment => environment.name),
      REPO_DEST: undefined,
      PROJECT_NAME: project.name,
    }

    repos?.forEach(async repo => {
      ansibleData.REPO_DEST = repo.internalRepoName
      const ansibleRes0 = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
        method: 'PUT',
        body: JSON.stringify(ansibleData),
        headers: {
          'Content-Type': 'application/json',
          authorization: req.headers.authorization,
          'request-id': req.id,
        },
      })
      const res0json = await ansibleRes0.json()
      await addLogs(res0json, userId)
      if (res0json?.status !== 'OK') throw new Error(`Echec de suppression du repo ${repo.internalRepoName} côté ansible`)
    })

    ansibleData.REPO_DEST = `${project.name}-argo`
    const ansibleRes1 = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
      method: 'PUT',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })
    const res1json = await ansibleRes1.json()
    await addLogs(res1json, userId)
    if (res1json?.status !== 'OK') throw new Error('Echec de suppression du projet-argo côté ansible')

    const ansibleRes2 = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project`, {
      method: 'PUT',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })
    const res2Json = await ansibleRes2.json()
    await addLogs(res2Json, userId)
    if (res2Json?.status !== 'OK') throw new Error('Echec de suppression du projet côté ansible')

    try {
      repos?.forEach(async repo => {
        await deleteRepository(repo.id)
      })
      environments?.forEach(async environment => {
        await deleteEnvironment(environment.id)
      })
      permissions?.forEach(async permission => {
        await deletePermissionById(permission.id)
      })
      users?.forEach(async user => {
        await deleteRoleByUserIdAndProjectId(user.id, projectId)
      })
      await archiveProject(projectId)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project archived and unlocked',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot unlock project',
        error: error?.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error?.message}`,
      error,
    })
    try {
      await updateProjectFailed(projectId)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ projectId }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status',
        error: error?.message,
      })
    }
    send500(res, error)
  }
}
