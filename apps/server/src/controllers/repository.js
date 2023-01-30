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
  lockProject,
  unlockProject,
} from '../models/queries/project-queries.js'
import {
  getEnvironmentsNamesByProjectId,
} from '../models/queries/environment-queries.js'
import {
  getRoleByUserIdAndProjectId,
  getSingleOwnerByProjectId,
} from '../models/queries/users-projects-queries.js'
import { getUserById } from '../models/queries/user-queries.js'
import { getLogInfos } from '../utils/logger.js'
import { send200, send201, send500 } from '../utils/response.js'
import { ansibleHost, ansiblePort } from '../utils/env.js'

// GET

export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  try {
    const repo = await getRepositoryById(repositoryId)
    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: 'Project successfully retrived',
    })
    send200(res, repo)
  } catch (error) {
    const message = 'Cannot retrieve repository'
    req.log.error({
      ...getLogInfos({ repositoryId }),
      description: message,
      error: error.message,
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
    if (!role) throw new Error('Requestor is not member of project')

    req.log.info({
      ...getLogInfos({ projectId }),
      description: 'Project successfully retrived',
    })
    send200(res, repos)
  } catch (error) {
    const message = 'Cannot retrieve repository'
    req.log.error({
      ...getLogInfos({ projectId }),
      description: message,
      error: error.message,
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
    if (!role) throw new Error('Requestor is not member of project')

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
  } catch (error) {
    const message = 'Cannot create repository'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : qst @tobi - Faut-il envoyer à ansible le owner du projet, ou le requestor (user qui crée le repo) ?
    // const requestor = await getUserById(userId)
    const ownerId = await getSingleOwnerByProjectId(projectId)
    const owner = await getUserById(ownerId)

    const environmentsNames = await getEnvironmentsNamesByProjectId(projectId)

    const ansibleData = {
      ORGANIZATION_NAME: project.organization,
      EMAIL: owner.email,
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

    // TODO : error: "fetch failed"
    await fetch(`http://${ansibleHost}:${ansiblePort}/api/v1/repos`, {
      method: 'POST',
      body: JSON.stringify(ansibleData),
      headers: {
        'Content-Type': 'application/json',
        authorization: req.headers.authorization,
      },
    })

    try {
      await updateRepositoryCreated(repo.id)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ repositoryId: repo.id }),
        description: 'Repository status successfully updated in database to created',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update repository status to created',
        error: error.message,
      })
      return send500(res, error.message)
    }

    send201(res, 'Repository successfully created')
  } catch (error) {
    const message = 'Provisioning repo with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })

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
      })
      return send500(res, error.message)
    }
    send500(res, message)
  }
}

// UPDATE
// TODO : maj controller
// si isPrivate, token obligatoire
// pas possible d'update isInfra et internalRepoName
export const updateRepositoryController = async (req, res) => {
  const data = req.body
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  let repo
  try {
    repo = await getRepositoryById(repositoryId)
    if (!repo) {
      const message = 'The required repository does not exists'
      req.log.error({
        ...getLogInfos(),
        description: message,
      })
      return send500(res, message)
    }

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')

    await lockProject(projectId)
    await updateRepository(repositoryId, data.info)

    const message = 'Repository successfully updated'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
  } catch (error) {
    const message = 'Cannot update repository'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : #131 : appel ansible
    try {
      await updateRepositoryCreated(repositoryId)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ repositoryId }),
        description: 'Repository status successfully updated in database to created',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update repository status to created',
        error: error.message,
      })
      return send500(res, error.message)
    }

    send201(res, 'Repository successfully updated')
  } catch (error) {
    const message = 'Provisioning repo with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })

    try {
      await updateRepositoryFailed(repositoryId)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ repositoryId }),
        description: 'Repo status successfully updated in database to failed',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot update repo status to failed',
        error: error.message,
      })
      return send500(res, error.message)
    }
    send500(res, message)
  }
}

// DELETE

export const deleteRepositoryController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  let repo
  try {
    repo = await getRepositoryById(repositoryId)
    if (!repo) {
      const message = 'The required repository does not exists'
      req.log.error({
        ...getLogInfos(),
        description: message,
      })
      return send500(res, message)
    }

    const role = await getRoleByUserIdAndProjectId(userId, projectId)
    if (!role) throw new Error('Requestor is not member of project')
    if (role.role !== 'owner') throw new Error('Requestor is not owner of project')

    await lockProject(projectId)
    await updateRepositoryDeleting(repositoryId)

    const message = 'Repository status successfully deleting'
    req.log.info({
      ...getLogInfos({ repositoryId }),
      description: message,
    })
  } catch (error) {
    const message = 'Cannot delete repository'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })
    return send500(res, message)
  }

  try {
    // TODO : #131 : appel ansible
    try {
      await deleteRepository(repositoryId)
      await unlockProject(projectId)

      req.log.info({
        ...getLogInfos({ repositoryId }),
        description: 'Repository successfully deleted, project unlocked',
      })
    } catch (error) {
      req.log.error({
        ...getLogInfos(),
        description: 'Cannot delete repository',
        error: error.message,
      })
      return send500(res, error.message)
    }

    send201(res, 'Repository successfully deleted')
  } catch (error) {
    const message = 'Provisioning repo with ansible failed'
    req.log.error({
      ...getLogInfos(),
      description: message,
      error: error.message,
    })

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
      })
      return send500(res, error.message)
    }
    send500(res, message)
  }
}
