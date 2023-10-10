import { addLogs, deleteRepository as deleteRepositoryQuery, getProjectInfos, getProjectInfosAndRepos, initializeRepository, lockProject, updateRepository as updateRepositoryQuery, updateRepositoryCreated, updateRepositoryDeleting, updateRepositoryFailed, getStageById } from '@/resources/queries-index.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { Project, Repository, User } from '@prisma/client'
import { projectRootDir } from '@/utils/env.js'
import { hooks } from '@/plugins/index.js'
import { unlockProjectIfNotFailed } from '@/utils/business.js'
import { exclude } from '@/utils/queries-tools.js'
import { CreateRepositoryDto, UpdateRepositoryDto } from '@dso-console/shared/src/resources/repository/dto.js'
import { ProjectRoles } from '@dso-console/shared'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'
import { gitlabUrl } from '@/plugins/core/gitlab/utils.js'

export const getRepositoryById = async (
  userId: User['id'],
  projectId: Project['id'],
  repositoryId: Repository['id'],
) => {
  const project = await getProjectAndcheckRole(userId, projectId)
  const repository = project.repositories?.find(repo => repo.id === repositoryId)
  if (!repository) throw new NotFoundError('Dépôt introuvable')
  return repository
}

export const getProjectRepositories = async (
  userId: User['id'],
  projectId: Project['id'],
) => {
  const project = await getProjectAndcheckRole(userId, projectId)
  const repositories = project.repositories
  if (!repositories.length) throw new NotFoundError('Aucun dépôt associé à ce projet')
  return repositories
}

export const getProjectAndcheckRole = async (
  userId: User['id'],
  projectId: Project['id'],
  minRole: ProjectRoles = 'user',
) => {
  const project = await getProjectInfosAndRepos(projectId)
  const errorMessage = checkInsufficientRoleInProject(userId, { roles: project.roles, minRole })
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
  return project
}

export const checkUpsertRepository = async (
  userId: User['id'],
  projectId: Project['id'],
  minRole: ProjectRoles,
) => {
  const project = await getProjectInfos(projectId)
  const errorMessage = checkRoleAndLocked(project, userId, minRole)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
}

type KeycloakUser = {
  id: User['id'],
  firstName: User['firstName'],
  lastName: User['lastName'],
  email: User['email'],
  groups?: Array<string>,
}

export const checkHookValidation = async (
  user: KeycloakUser,
) => {
  const isValid = await hooks.createProject.validate({ owner: exclude(user, ['groups']) })
  if (isValid?.failed) {
    const reasons = Object.values(isValid)
      // @ts-ignore
      .filter(({ status }) => status?.result === 'KO')
      // @ts-ignore
      .map(({ status }) => status?.message)
      .join('; ')
    throw new UnprocessableContentError(reasons, undefined)
  }
}

export const createRepository = async (
  projectId: Project['id'],
  data: CreateRepositoryDto['body'],
  userId: User['id'],
) => {
  const project = await getProjectInfosAndRepos(projectId)

  if (project.repositories?.find(repo => repo.internalRepoName === data.internalRepoName)) throw new BadRequestError(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`, undefined)

  const dbData = { ...data }
  delete dbData.externalToken

  await lockProject(projectId)
  const repo = await initializeRepository(dbData)

  try {
    const stageIds = project.environments?.map(env => env.stageId)
    const environmentNames = []
    for (const stageId of stageIds) {
      environmentNames.push((await getStageById(stageId)).name)
    }

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
    results.args.externalToken = 'information cachée'
    await addLogs('Create Repository', results, userId)
    if (results.failed) throw new BadRequestError('Echec des services lors de la création du dépôt', undefined)

    await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(projectId)

    return repo
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new Error('Echec de la création du dépôt')
  }
}

export const updateRepository = async (
  projectId: Project['id'],
  repositoryId: Repository['id'],
  data: Partial<UpdateRepositoryDto['body']>,
  userId: User['id'],
) => {
  const project = await getProjectInfos(projectId)

  await lockProject(project.id)

  const dbData = { ...data }
  delete dbData.externalToken
  let repo = await updateRepositoryQuery(repositoryId, dbData)

  try {
    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
      externalToken: data.externalToken,
    }
    delete repoData?.isInfra

    const results = await hooks.updateRepository.execute(repoData)
    results.args.externalToken = 'information cachée'
    await addLogs('Update Repository', results, userId)
    if (results.failed) throw new UnprocessableContentError('Echec des services associés au dépôt', undefined)

    repo = await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(project.id)

    return repo
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new Error('Echec de la mise à jour du dépôt')
  }
}

export const deleteRepository = async (
  projectId: Project['id'],
  repositoryId: Repository['id'],
  userId: User['id'],
) => {
  const project = await getProjectAndcheckRole(userId, projectId, 'owner')

  const repo = await getRepositoryById(userId, projectId, repositoryId)

  await lockProject(project.id)

  await updateRepositoryDeleting(repositoryId)

  try {
    const stageIds = project.environments?.map(env => env.stageId)
    const environmentNames = []
    for (const stageId of stageIds) {
      environmentNames.push((await getStageById(stageId)).name)
    }

    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
      services: project.services,
      environments: environmentNames,
      internalUrl: `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/${repo.internalRepoName}.git`,
    }

    const results = await hooks.deleteRepository.execute(repoData)
    await addLogs('Delete Repository', results, userId)
    if (results.failed) throw new UnprocessableContentError('Echec des opérations', undefined)
    await deleteRepositoryQuery(repositoryId)
    await unlockProjectIfNotFailed(projectId)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new Error('Echec de la mise à jour du dépôt')
  }
}
