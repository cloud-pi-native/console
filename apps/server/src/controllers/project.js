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
  // updateProjectServices,
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
import { projectSchema } from 'shared/src/schemas/project.js'
import { calcProjectNameMaxLength } from 'shared/src/utils/functions.js'
import { getServices } from '../utils/services.js'
import { lowercaseFirstLetter, replaceNestedKeys } from '../utils/queries-tools.js'
// import hooksFns from '../plugins/index.js'

// GET
export const getUserProjectsController = async (req, res) => {
  const requestor = req.session?.user

  try {
    const user = await getOrCreateUser(requestor)
    if (!user) return send200(res, [])

    let projects = await getUserProjects(user)
    req.log.info({
      ...getLogInfos(),
      description: 'Projets récupérés',
    })
    if (!projects.length) return send200(res, [])

    projects = projects.filter(project => project.status !== 'archived')
      .map(project => project.get({ plain: true }))
      .map(project => replaceNestedKeys(project, lowercaseFirstLetter))
      .map(project => ({ ...project, services: getServices(project) }))

    send200(res, projects)
  } catch (error) {
    const message = `Projets non trouvés: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
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
      description: 'Projet récupéré',
    })
    send200(res, project)
  } catch (error) {
    const message = `Projet non trouvé: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
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
    const message = `Projet non trouvé: ${error.message}`
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// POST
export const createProjectController = async (req, res) => {
  const data = req.body
  const user = req.session?.user

  let environment
  let project
  let owner

  const organization = await getOrganizationById(data.organization)
  try {
    owner = await getOrCreateUser({ id: user.id, email: user?.email, firstName: user?.firstName, lastName: user?.lastName })

    await projectSchema.validateAsync(data, { context: { projectNameMaxLength: calcProjectNameMaxLength(organization.name) } })

    project = await getProject({ name: data.name, organization: data.organization })
    if (project?.status === 'archived') throw new Error(`"${data.name}" est archivé et n'est plus disponible`)
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
      description: `Projet non créé: ${error.message}`,
      error: error.message,
      stack: error.stack,
      data: error.request,
    })
    return send500(res, error.message)
  }

  // Process api call to external service
  try {
    const projectData = {
      ...project.get({ plain: true }),
      organization: organization.dataValues.name,
      email: owner.dataValues.email,
      userId: owner.dataValues.id,
    }

    const results = await hooksFns.createProject(projectData)
    // const { gitlab, registry } = result
    // const services = {
    //   gitlab: {
    //     id: gitlab.result.group.id,
    //   },
    //   registry: {
    //     id: registry.result.project.project_id,
    //   },
    // }
    // await updateProjectServices(project.id, services)
    await addLogs(results, owner.dataValues.id)
    if (results.failed) throw new Error('Echec de création du projet')
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
    await updateProjectFailed(project.id)
    await unlockProject(project.id)
    return
  }

  // Update DB after service call
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
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update project status to created',
      error: error.message,
      trace: error.trace,
    })
  }

  // try {
  //   await updateProjectFailed(project.id)
  //   await unlockProject(project.id)

  //   req.log.info({
  //     ...getLogInfos({ projectId: project.id }),
  //     description: 'Project status successfully updated in database',
  //   })
  // } catch (error) {
  //   req.log.error({
  //     ...getLogInfos(),
  //     description: 'Cannot update project status to failed',
  //     error: error.message,
  //     trace: error.trace,
  //   })
  // }
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
      description: `Cannot lock project: ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, error?.message)
  }

  // Process api call to external service
  try {
    const organization = await getOrganizationById(project.organization)

    const projectData = {
      ...project.get({ plain: true }),
      organization: organization.dataValues.name,
    }
    const results = await hooksFns.archiveProject(projectData)
    await addLogs(results, userId)
    if (results.failed) throw new Error('Echec de suppression du projet côté ansible')
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: `Echec requête ${req.id} : ${error.message}`,
      error: error.message,
      trace: error.trace,
    })
  }

  // Update DB after service call
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
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot unlock project',
      error: error?.message,
    })
  }

  try {
    await updateProjectFailed(projectId)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project status successfully updated in database',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update project status',
      error: error.message,
      trace: error.trace,
    })
  }
}
