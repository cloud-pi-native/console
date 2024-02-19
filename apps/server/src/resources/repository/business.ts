import { addLogs, deleteRepository as deleteRepositoryQuery, getProjectInfos, getProjectInfosAndRepos, initializeRepository, lockProject, updateRepository as updateRepositoryQuery, updateRepositoryCreated, updateRepositoryDeleting, updateRepositoryFailed, getUserById } from '@/resources/queries-index.js'
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError, UnprocessableContentError } from '@/utils/errors.js'
import type { Project, Repository, User } from '@prisma/client'
import { projectRootDir, gitlabUrl } from '@/utils/env.js'
import { unlockProjectIfNotFailed, checkCreateProject as checkCreateRepositoryPlugins, validateSchema } from '@/utils/business.js'
import { type CreateRepositoryDto, type ProjectRoles, CreateRepoBusinessSchema, type UpdateRepositoryDto } from '@dso-console/shared'
// TODO remove gitlabUrl
import { hooks } from '@dso-console/hooks'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'

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
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)
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
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)
  const errorMessage = checkRoleAndLocked(project, userId, minRole)
  if (errorMessage) throw new ForbiddenError(errorMessage, undefined)
}

export const createRepository = async (
  projectId: Project['id'],
  data: CreateRepositoryDto,
  userId: User['id'],
  requestId: string,
) => {
  const schemaValidation = CreateRepoBusinessSchema.safeParse({ ...data, projectId })
  validateSchema(schemaValidation)

  await checkUpsertRepository(userId, projectId, 'owner')
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Veuillez vous identifier')

  await checkCreateRepositoryPlugins(user, 'Repository', requestId)
  const project = await getProjectInfosAndRepos(projectId)
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

  if (project.repositories?.find(repo => repo.internalRepoName === data.internalRepoName)) throw new BadRequestError(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`, undefined)
  const dbData = { ...data, projectId, isInfra: !!data.isInfra, isPrivate: !!data.isPrivate }
  delete dbData.externalToken

  await lockProject(projectId)

  const repo = await initializeRepository(dbData)
  try {
    const repoData: hooks.RepositoryCreate = {
      ...repo,
      externalUserName: repo.externalUserName ?? undefined,
      project: project.name,
      organization: project.organization.name,
      environments: project.environments?.map(environment => environment.name),
      internalUrl: `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/${repo.internalRepoName}.git`,
    }
    if (data.isPrivate) {
      repoData.externalUserName = data.externalUserName
      repoData.externalToken = data.externalToken
    }

    const results = await hooks.createRepository.execute(repoData)
    results.args.externalToken = 'information cachée'
    await addLogs('Create Repository', results, userId, requestId)
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
  data: Partial<UpdateRepositoryDto>,
  userId: User['id'],
  requestId: string,
) => {
  const project = await getProjectInfos(projectId)
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)

  await lockProject(project.id)

  const dbData = { ...data }
  delete dbData.externalToken
  let repo = await updateRepositoryQuery(repositoryId, dbData)

  try {
    const repoData: hooks.RepositoryUpdate = {
      ...repo,
      externalUserName: repo.externalUserName ?? undefined,
      project: project.name,
      organization: project.organization.name,
      externalToken: data.externalToken,
    }

    const results = await hooks.updateRepository.execute(repoData)
    results.args.externalToken = 'information cachée'
    await addLogs('Update Repository', results, userId, requestId)
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
  requestId: string,
) => {
  const project = await getProjectAndcheckRole(userId, projectId, 'owner')

  const repo = await getRepositoryById(userId, projectId, repositoryId)

  await lockProject(project.id)

  await updateRepositoryDeleting(repositoryId)

  try {
    const repoData: hooks.RepositoryDelete = {
      ...repo,
      externalUserName: repo.externalUserName ?? undefined,
      project: project.name,
      organization: project.organization.name,
      environments: project.environments?.map(environment => environment.name),
      internalUrl: `${gitlabUrl}/${projectRootDir}/${project.organization.name}/${project.name}/${repo.internalRepoName}.git`,
    }

    const results = await hooks.deleteRepository.execute(repoData)
    await addLogs('Delete Repository', results, userId, requestId)
    if (results.failed) throw new UnprocessableContentError('Echec des opérations', undefined)
    await deleteRepositoryQuery(repositoryId)
    await unlockProjectIfNotFailed(projectId)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new Error('Echec de la mise à jour du dépôt')
  }
}
