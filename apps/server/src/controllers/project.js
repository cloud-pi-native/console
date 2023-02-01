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
} from '../models/queries/project-queries.js'
import { getUserById } from '../models/queries/user-queries.js'
import {
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'
import { projectSchema } from 'shared/src/schemas/project.js'
import { replaceNestedKeys, lowercaseFirstLetter } from '../utils/queries-tools.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const userId = req.session?.user?.id

  try {
    const user = await getUserById(userId)
    const projects = await getUserProjects(user)
    req.log.info({
      ...getLogInfos(),
      description: 'Projects successfully retreived',
    })
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
    const orgName = await getOrganizationById(project.organization)

    const ansibleData = {
      ORGANIZATION_NAME: orgName,
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

  try {
    const project = await getProjectById(projectId)
    if (!project) throw new Error('Project not found')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')
    if (role.role !== 'owner') throw new Error('Requestor is not owner of project')

    await lockProject(projectId)
    await archiveProject(projectId)
    req.log.info({
      ...getLogInfos({
        projectId,
      }),
      description: 'Project successfully archived in database',
    })
    send200(res, projectId)
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Cannot archive project: ${error.message}`,
      error: error.message,
    })
    return send500(res, error.message)
  }

  try {
    // TODO : US #130 appel ansible
    try {
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
