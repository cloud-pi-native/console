import { addLogs, deleteRepository, getProjectInfos, getProjectInfosAndRepos, initializeRepository, lockProject, updateRepository, updateRepositoryCreated, updateRepositoryDeleting, updateRepositoryFailed } from '@/resources/queries-index.js'
import { BadRequestError, NotFoundError, UnprocessableContentError } from '@/utils/errors.js'
import { Project, Repository, User } from '@prisma/client'
import { gitlabUrl, projectRootDir } from '@/utils/env.js'
import { hooks } from '@/plugins/index.js'
import { unlockProjectIfNotFailed } from '@/utils/controller.js'
import { exclude } from '@/utils/queries-tools.js'
import { CreateRepositoryDto, UpdateRepositoryDto } from 'shared/src/resources/repository/dto'

export const getRepositoryByIdBusiness = async (
  projectId: Project['id'],
  repositoryId: Repository['id'],
) => {
  const project = await getProjectInfosAndRepos(projectId)
  const repository = project.repositories?.find(repo => repo.id === repositoryId)
  if (!repository) throw new NotFoundError('Dépôt introuvable')
  return repository
}

export const getProjectRepositoriesBusiness = async (projectId: Project['id']) => {
  const project = await getProjectInfosAndRepos(projectId)
  const repositories = project.repositories
  if (!repositories.length) throw new NotFoundError('Aucun dépôt associé à ce projet')
  return repositories
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

export const createRepositoryBusiness = async (
  projectId: Project['id'],
  data: CreateRepositoryDto['body'],
  userId: User['id'],
) => {
  const project = await getProjectInfosAndRepos(projectId)

  if (project.repositories?.find(repo => repo.internalRepoName === data.internalRepoName)) throw new BadRequestError(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`, undefined)

  await lockProject(projectId)
  const repo = await initializeRepository(data)

  try {
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
    await addLogs('Create Repository', results, userId)
    if (results.failed) throw new BadRequestError('Echec des services lors de la création du dépôt', undefined)
    await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(projectId)

    return repo
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new BadRequestError('Echec de la création du dépôt', undefined)
  }
}

export const updateRepositoryBusiness = async (
  projectId: Project['id'],
  repositoryId: Repository['id'],
  data: Partial<UpdateRepositoryDto['body']>,
  userId: User['id'],
) => {
  const project = await getProjectInfos(projectId)

  await lockProject(project.id)

  let repo = await updateRepository(repositoryId, data)

  try {
    const repoData = {
      ...repo,
      project: project.name,
      organization: project.organization.name,
    }
    delete repoData?.isInfra
    delete repoData?.internalRepoName

    const results = await hooks.updateRepository.execute(repoData)
    await addLogs('Update Repository', results, userId)
    if (results.failed) throw new UnprocessableContentError('Echec des services associés au dépôt', undefined)

    repo = await updateRepositoryCreated(repo.id)
    await unlockProjectIfNotFailed(project.id)

    return repo
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new BadRequestError('Echec de la mise à jour du dépôt', undefined)
  }
}

export const deleteRepositoryBusiness = async (
  projectId: Project['id'],
  repositoryId: Repository['id'],
  userId: User['id'],
) => {
  const project = await getProjectInfos(projectId)
  const repo = await getRepositoryByIdBusiness(projectId, repositoryId)

  await lockProject(project.id)

  await updateRepositoryDeleting(repositoryId)

  try {
    const environmentNames = project.environments?.map(env => env.name)

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
    await deleteRepository(repositoryId)
    await unlockProjectIfNotFailed(projectId)
  } catch (error) {
    await updateRepositoryFailed(repo.id)
    throw new BadRequestError('Echec de la mise à jour du dépôt', undefined)
  }
}
