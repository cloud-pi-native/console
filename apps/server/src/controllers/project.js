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
import { getUserById } from '../models/queries/user-queries.js'
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
} from '../models/queries/environment-queries.js'
import {
  getEnvironmentPermissions,
  deletePermissionById,
} from '../models/queries/permission-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { replaceNestedKeys, lowercaseFirstLetter } from '../utils/queries-tools.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const userId = req.session?.user?.id

  try {
    const user = await getUserById(userId)
    let projects = await getUserProjects(user)
    req.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retreived',
    })
    projects = projects.filter(project => project.status !== 'archived')
    projects.map(project => replaceNestedKeys(project, lowercaseFirstLetter))
    return send200(res, projects)
  } catch (error) {
    const message = `Cannot retrieve projects: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
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
    if (!role) throw new Error('Requestor is not member of project')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project successfully retrived',
    })
    send200(res, project)
  } catch (error) {
    const message = `Cannot retrieve project: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

export const getProjectOwnerController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id

  try {
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    const ownerId = await getSingleOwnerByProjectId(projectId)
    const owner = await getUserById(ownerId)

    req.log.info({
      ...getLogInfos({ owner }),
      description: 'Project owner successfully retrived',
    })
    send200(res, owner)
  } catch (error) {
    const message = `Cannot retrieve project: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
    })
    send500(res, message)
  }
}

// POST
export const createProjectController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user?.id

  let project

  try {
    await projectSchema.validateAsync(data)

    project = await getProject({ name: data.name, organization: data.organization })
    if (project) throw new Error('Un projet avec le nom et dans l\'organisation demandés existe déjà')

    project = await initializeProject(data)
    const user = await getUserById(userId)
    await addUserToProject({ project, user, role: 'owner' })
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
      description: `Cannot create project: ${error.message}`,
      error: error.message,
    })
    return send500(res, error.message)
  }

  try {
    const owner = await getUserById(userId)
    const organization = await getOrganizationById(project.organization)

    const ansibleData = {
      ORGANIZATION_NAME: organization.name,
      EMAILS: owner.email,
      PROJECT_NAME: project.name,
    }
    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
      body: ansibleData,
    })

    try {
      project = await updateProjectCreated(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to created',
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
      error,
    })
    try {
      project = await updateProjectFailed(project.id)

      req.log.info({
        ...getLogInfos({ projectId: project.id }),
        description: 'Project status successfully updated in database',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update project status to failed',
        error: error.message,
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
    if (!project) throw new Error('Project not found')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')
    if (role.role !== 'owner') throw new Error('Requestor is not owner of project')

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
      description: `Cannot lock project: ${error.message}`,
      error: error.message,
    })
    return send500(res, error.message)
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
      await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
        method: 'PUT',
        body: JSON.stringify(ansibleData),
        headers: {
          'Content-Type': 'application/json',
          authorization: req.headers.authorization,
          'request-id': req.id,
        },
      })
    })
    ansibleData.REPO_DEST = `${project.name}-argo`
    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
      method: 'PUT',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })

    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project`, {
      method: 'PUT',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })
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
        error: error.message,
      })
    }
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Provisioning project with ansible failed',
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
        error: error.message,
      })
    }
    send500(res, error)
  }
}
