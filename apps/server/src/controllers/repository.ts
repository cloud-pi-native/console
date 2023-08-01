import {
  getRepositoryById,
  initializeRepository,
  updateRepositoryCreated,
  updateRepositoryFailed,
  updateRepository,
  updateRepositoryDeleting,
  deleteRepository,
} from '../queries/repository-queries.js'
import {
  getProjectInfos,
  getProjectInfosAndRepos,
  lockProject,
} from '../queries/project-queries.js'
import { exclude, filterObjectByKeys } from '../utils/queries-tools.js'
import { addReqLogs } from '../utils/logger.js'
import { sendOk, sendCreated, sendUnprocessableContent, sendNotFound, sendBadRequest, sendForbidden } from '../utils/response.js'
import { addLogs } from '../queries/log-queries.js'
import { gitlabUrl, projectRootDir } from '../utils/env.js'
import { AsyncReturnType, checkInsufficientRoleInProject, unlockProjectIfNotFailed } from '../utils/controller.js'
import { hooks } from '../plugins/index.js'
import { projectIsLockedInfo } from 'shared'
import { EnhancedFastifyRequest } from '@/types/index.js'
import { CreateRepositoryDto, DeleteRepositoryDto, UpdateRepositoryDto } from 'shared/src/resources/repository/dto.js'

// GET
export const getRepositoryByIdController = async (req, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  try {
    const project = await getProjectInfosAndRepos(projectId)
    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    const repository = project.repositories.find(repo => repo.id === repositoryId)
    if (!repository) throw new Error('Dépôt introuvable')

    addReqLogs({
      req,
      description: 'Dépôt récupéré avec succès',
      extras: {
        repositoryId,
        projectId,
      },
    })
    sendOk(res, repository)
  } catch (error) {
    const description = 'Echec de la récupération du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        repositoryId,
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

export const getProjectRepositoriesController = async (req, res) => {
  const projectId = req.params?.projectId
  const userId = req.session?.user?.id
  try {
    const { roles, repositories } = await getProjectInfosAndRepos(projectId)

    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    addReqLogs({
      req,
      description: 'Dépôts du projet récupérés avec succès',
      extras: {
        projectId,
        repositoriesId: repositories.map(({ id }) => id).join(', '),
      },
    })
    sendOk(res, repositories)
  } catch (error) {
    const description = 'Echec de la récupération des dépôt du projet'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    sendNotFound(res, description)
  }
}

// CREATE
export const createRepositoryController = async (req: EnhancedFastifyRequest<CreateRepositoryDto>, res) => {
  const data = req.body
  const user = req.session?.user
  const projectId = req.params?.projectId
  data.projectId = projectId

  let project: AsyncReturnType<typeof getProjectInfosAndRepos>
  let repo: AsyncReturnType<typeof initializeRepository>
  try {
    const isValid = await hooks.createProject.validate({ owner: exclude(user, ['groups']) })
    if (isValid?.failed) {
      const reasons = Object.values(isValid)
        // @ts-ignore
        .filter(({ status }) => status?.result === 'KO')
        // @ts-ignore
        .map(({ status }) => status?.message)
        .join('; ')
      sendUnprocessableContent(res, reasons)

      addReqLogs({
        req,
        description: 'Dépôt récupéré avec succès',
        extras: {
          reasons,
        },
        error: new Error('Failed to validation repository creation'),
      })
      addLogs('Create Project Validation', { reasons }, user.id)
      return
    }
    project = await getProjectInfosAndRepos(projectId)
    if (!project) throw new Error('Le projet n\'existe pas')
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(user.id, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessage) return sendForbidden(res, insufficientRoleErrorMessage)

    if (project.repositories.find(repo => repo.internalRepoName === data.internalRepoName)) return sendBadRequest(res, `Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`)

    await lockProject(projectId)
    repo = await initializeRepository(data)

    const environmentNames = project.environments?.map(env => env.name)

    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
      environments: environmentNames,
      internalUrl: `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/${repo.internalRepoName}.git`,
    }
    if (data.isPrivate) {
      repoData.externalUserName = data.externalUserName
      repoData.externalToken = data.externalToken
    }

    const results = await hooks.createRepository.execute(repoData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Create Repository', results, user.id)
    if (results.failed) throw new Error('Echec des services lors de la création du dépôt')
    await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(projectId)

    addReqLogs({
      req,
      description: 'Dépôt créé avec succès',
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    sendCreated(res, repo)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    const description = 'Echec de la création du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
      },
      error,
    })
    return sendBadRequest(res, description)
  }
}

// UPDATE
export const updateRepositoryController = async (req: EnhancedFastifyRequest<UpdateRepositoryDto>, res) => {
  const userId = req.session?.user?.id
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId

  const keysAllowedForUpdate = [
    'externalRepoUrl',
    'isPrivate',
    'externalToken',
    'externalUserName',
  ]
  const data = filterObjectByKeys(req.body, keysAllowedForUpdate)
  // Do not save external token in db
  const externalToken = data.externalToken
  delete data.externalToken

  let repo: AsyncReturnType<typeof getRepositoryById>
  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)
    if (project.locked) return sendForbidden(res, projectIsLockedInfo)

    if (data.isPrivate && !externalToken) throw new Error('Le token est requis')
    if (data.isPrivate && !data.externalUserName) throw new Error('Le nom d\'utilisateur est requis')

    repo = await getRepositoryById(repositoryId)
    if (!repo) throw new Error('Dépôt introuvable')

    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles })
    if (insufficientRoleErrorMessage) throw new Error(insufficientRoleErrorMessage)

    await lockProject(projectId)

    if (!data.isPrivate) {
      data.externalToken = undefined
      data.externalUserName = ''
    }

    repo = await updateRepository(repositoryId, data)

    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
    }
    delete repoData?.isInfra
    delete repoData?.internalRepoName

    const results = await hooks.updateRepository.execute(repoData)
    // @ts-ignore TODO fix types HookPayload and Prisma.JsonObject
    await addLogs('Update Repository', results, userId)
    if (results.failed) throw new Error('Echec des services associés au dépôt')

    await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(projectId)

    const description = 'Dépôt mis à jour avec succès'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId,
      },
    })
    sendOk(res, description)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    const description = 'Echec de la mise à jour du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId,
      },
      error,
    })
    return sendBadRequest(res, description)
  }
}

// DELETE
export const deleteRepositoryController = async (req: EnhancedFastifyRequest<DeleteRepositoryDto>, res) => {
  const projectId = req.params?.projectId
  const repositoryId = req.params?.repositoryId
  const userId = req.session?.user?.id

  let repo: AsyncReturnType<typeof getRepositoryById>
  let project: AsyncReturnType<typeof getProjectInfos>
  try {
    project = await getProjectInfos(projectId)

    const insufficientRoleErrorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole: 'owner' })
    if (insufficientRoleErrorMessage) return sendForbidden(res, insufficientRoleErrorMessage)

    repo = await getRepositoryById(repositoryId)
    if (!repo) return sendNotFound(res, 'Dépôt introuvable')

    await lockProject(projectId)
    await updateRepositoryDeleting(repositoryId)

    const environmentNames = project.environments?.map(env => env.name)

    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
      services: project.services,
      environments: environmentNames,
      internalUrl: `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/${repo.internalRepoName}.git`,
    }

    // TODO: Fix type
    const results = await hooks.deleteRepository.execute(repoData)
    // @ts-ignore See TODO
    await addLogs('Delete Repository', results, userId)
    if (results.failed) throw new Error('Echec des opérations')
    await deleteRepository(repositoryId)
    await unlockProjectIfNotFailed(projectId)

    const description = 'Dépôt en cours de suppression'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId: repo.id,
      },
    })
    sendOk(res, description)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    const description = 'Echec de la suppression du dépôt'
    addReqLogs({
      req,
      description,
      extras: {
        projectId,
        repositoryId: repo.id,
      },
      error,
    })
    return sendBadRequest(res, description)
  }
}
