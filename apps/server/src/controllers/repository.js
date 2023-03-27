import {
  getRepositoryById,
  getProjectRepositories,
  initializeRepository,
  updateRepositoryCreated,
  updateRepositoryFailed,
  updateRepository,
  updateRepositoryDeleting,
  deleteRepository,
} from '../models/queries/repository-queries.js'
import {
  getProjectById,
  getProjectUsers,
  lockProject,
  unlockProject,
} from '../models/queries/project-queries.js'
import {
  getEnvironmentsByProjectId,
} from '../models/queries/environment-queries.js'
import {
  getRoleByUserIdAndProjectId,
} from '../models/queries/users-projects-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { getOrganizationById } from '../models/queries/organization-queries.js'
import { addLogs } from '../models/queries/log-queries.js'
// import hooksFns from '../plugins/index.js'

// GET
export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  try {
    const repo = await getRepositoryById(repositoryId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Project successfully retrived',
    })
    send200(res, repo)
  } catch (error) {
    const message = 'Dépôt non trouvé'
    req.log.error({
      ...getLogInfos({ repositoryId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

export const getProjectRepositoriesController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id
  try {
    const repos = await getProjectRepositories(projectId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project successfully retrived',
    })
    send200(res, repos)
  } catch (error) {
    const message = 'Dépôt non trouvé'
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    send500(res, message)
  }
}

// CREATE
export const createRepositoryController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  data.projectId = projectId
  const h = req.h.createRepository.execute

  let project
  let repo
  try {
    project = await getProjectById(projectId)
    if (!project) {
      const message = 'The required project does not exists'
      req.log.error({
        ...getLogInfos(),
        description: message,
      })
      return send500(res, message)
    }

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    const repos = await getProjectRepositories(projectId)
    const isInternalRepoNameTaken = repos.find(repo => repo.internalRepoName === data.internalRepoName)
    if (isInternalRepoNameTaken) throw new Error(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`)

    await lockProject(projectId)
    repo = await initializeRepository(data)

    const message = 'Repository successfully created'
    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: message,
    })
    send201(res, 'Repository successfully created')
  } catch (error) {
    const message = 'Dépôt non créé'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, message)
  }

  // Process api call to external service
  try {
    const users = await getProjectUsers(projectId)

    const envRes = await getEnvironmentsByProjectId(projectId)
    const environmentsNames = envRes.map(env => env.name)

    const organization = await getOrganizationById(project.organization)

    const ansibleData = {
      ORGANIZATION_NAME: organization.name,
      EMAILS: users.map(user => user.email),
      PROJECT_NAME: project.name,
      REPO_DEST: data.internalRepoName,
      REPO_SRC: data.externalRepoUrl.startsWith('http') ? data.externalRepoUrl.split('://')[1] : data.externalRepoUrl,
      IS_INFRA: data.isInfra,
      ENV_LIST: environmentsNames,
    }
    if (data.isPrivate) {
      ansibleData.GIT_INPUT_USER = data.externalUserName
      ansibleData.GIT_INPUT_PASSWORD = data.externalToken
    }

    const ansibleRes = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
      method: 'POST',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })
    const resJson = await ansibleRes.json()
    await addLogs(resJson, userId)
    if (resJson.status !== 'OK') throw new Error(`Echec de création du repo ${repo.internalRepoName} côté ansible`)
  } catch (error) {
    const message = `Echec requête ${req.id} : ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return
  }

  // Update DB after service call
  try {
    await updateRepositoryCreated(repo.id)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: 'Repository status successfully updated in database to created',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update repository status to created',
      error: error.message,
      trace: error.trace,
    })
  }

  try {
    await updateRepositoryFailed(repo.id)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId: repo.id }),
      description: 'Repo status successfully updated in database to failed',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update repo status to failed',
      error: error.message,
      trace: error.trace,
    })
  }
}

// UPDATE
export const updateRepositoryController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  let repo
  try {
    if (data.isPrivate && !data.externalToken) throw new Error('Le token est requis')
    if (data.isPrivate && !data.externalUserName) throw new Error('Le nom d\'utilisateur est requis')

    repo = await getRepositoryById(repositoryId)
    if (!repo) {
      const message = 'Dépôt introuvable'
      req.log.error({
        ...getLogInfos(),
        description: message,
      })
      return send500(res, message)
    }

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')

    await lockProject(projectId)
    await updateRepository(repositoryId, data.info)

    const message = 'Repository successfully updated'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
  } catch (error) {
    const message = `Cannot update repository: ${error.message}`
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, message)
  }

  try {
    await updateRepositoryCreated(repositoryId)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Repository status successfully updated in database to created',
    })
    return send201(res, 'Repository successfully updated')
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update repository status to created',
      error: error.message,
      trace: error.trace,
    })
  }

  let message
  try {
    await updateRepositoryFailed(repositoryId)
    await unlockProject(projectId)

    message = 'Repo status successfully updated in database to failed'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
  } catch (error) {
    message = 'Cannot update repo status to failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
  }
  send500(res, message)
}

// DELETE
export const deleteRepositoryController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  let repo
  try {
    repo = await getRepositoryById(repositoryId)
    if (!repo) throw new Error('Dépôt introuvable')

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Vous n\'êtes pas membre du projet')
    if (role.role !== 'owner') throw new Error('Vous n\'êtes pas souscripteur du projet')

    await lockProject(projectId)
    await updateRepositoryDeleting(repositoryId)

    const message = 'Repository status successfully deleting'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
    send200(res, 'Repository successfully deleting')
  } catch (error) {
    const message = 'Cannot delete repository'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return send500(res, message)
  }

  // Process api call to external service
  try {
    const project = await getProjectById(projectId)
    const organization = await getOrganizationById(project.organization)
    const environments = await getEnvironmentsByProjectId(projectId)

    const ansibleData = {
      ORGANIZATION_NAME: organization.name,
      ENV_LIST: environments.map(environment => environment.name),
      REPO_DEST: repo.internalRepoName,
      PROJECT_NAME: project.name,
    }

    const ansibleRes = await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/project/repos`, {
      method: 'PUT',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
        'request-id': req.id,
      },
    })
    const resJson = await ansibleRes.json()
    await addLogs(resJson, userId)
    if (resJson.status !== 'OK') throw new Error(`Echec de suppression du repo ${repo.internalRepoName} côté ansible`)
  } catch (error) {
    const message = 'Provisioning repo with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
      trace: error.trace,
    })
    return
  }

  // Update DB after service call
  try {
    await deleteRepository(repositoryId)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Repository successfully deleted, project unlocked',
    })
    return
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot delete repository',
      error: error.message,
      trace: error.trace,
    })
  }

  try {
    await updateRepositoryFailed(repositoryId)
    await unlockProject(projectId)

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Repository status successfully updated in database to failed, project unlocked',
    })
  } catch (error) {
    req.log.error({
      ...getLogInfos(),
      description: 'Cannot update repository status to failed',
      error: error.message,
      trace: error.trace,
    })
  }
}
