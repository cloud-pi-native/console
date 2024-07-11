import type { Repository, User, Role } from '@prisma/client'
import type { Project, CreateRepositoryBody, ProjectRoles, UpdateRepositoryBody } from '@cpn-console/shared'
import { addLogs, deleteRepository as deleteRepositoryQuery, getRepositoryById as getRepositoryByIdQuery, getProjectInfosAndRepos, getUserById, initializeRepository, updateRepository as updateRepositoryQuery, getProjectRepositories as getProjectRepositoriesQuery, getProjectInfosOrThrow } from '@/resources/queries-index.js'
import { checkInsufficientRoleInProject, checkRoleAndLocked } from '@/utils/controller.js'
import { BadRequestError, DsoError, ForbiddenError, NotFoundError, UnauthorizedError, UnprocessableContentError } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export const getRepositoryById = async (
  userId: User['id'],
  projectId: Project['id'],
  repositoryId: Repository['id'],
) => {
  const project = await getProjectAndCheckRole(userId, projectId)
  const repository = project.repositories?.find(repo => repo.id === repositoryId)
  if (!repository) throw new NotFoundError('Dépôt introuvable')
  return repository
}

export const getProjectRepositories = async (
  userId: User['id'],
  isAdmin: boolean,
  projectId: Project['id'],
) => {
  const repositories = isAdmin ? await getProjectRepositoriesQuery(projectId) : (await getProjectAndCheckRole(userId, projectId)).repositories
  return repositories
}

export const getProjectAndCheckRole = async (
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

export const syncRepository = async (
  {
    repositoryId,
    userId,
    branchName,
    requestId,
  }: {
    repositoryId: Repository['id'],
    userId: User['id'],
    branchName: string,
    requestId: string,
  }) => {
  try {
    const repository = await getRepositoryByIdQuery(repositoryId)
    const project = await getProjectInfosOrThrow(repository.projectId)
    await checkUpsertRepository({ project, userId })

    const hookReply = await hook.misc.syncRepository(repositoryId, { branchName })
    await addLogs('Sync Repository', hookReply, userId, requestId)
    if (hookReply.failed) {
      throw new UnprocessableContentError('Echec des services à la synchronisation du dépôt')
    }
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error('Echec de la synchronisation du dépôt')
  }
}

export const checkUpsertRepository = async (
  {
    project,
    userId,
    minRole = 'user',
  }: { userId: User['id'], project: { locked: Project['locked'], roles: Role[] }, minRole?: ProjectRoles, }) => {
  const errorMessage = checkRoleAndLocked(project, userId, minRole)
  if (errorMessage) throw new ForbiddenError(errorMessage)
}

export const createRepository = async (
  {
    projectId,
    data,
    userId,
    requestId,
  }: {
    projectId: Project['id'],
    data: CreateRepositoryBody,
    userId: User['id'],
    requestId: string
  }) => {
  const user = await getUserById(userId)
  if (!user) throw new UnauthorizedError('Veuillez vous identifier')

  const project = await getProjectInfosAndRepos(projectId)
  if (!project) throw new BadRequestError(`Le projet ayant pour id ${projectId} n'existe pas`)
  await checkUpsertRepository({ project, userId, minRole: 'owner' })

  if (project.repositories?.find(repo => repo.internalRepoName === data.internalRepoName)) throw new BadRequestError(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`, undefined)
  const dbData = { ...data, projectId, isInfra: !!data.isInfra, isPrivate: !!data.isPrivate }
  delete dbData.externalToken

  const repo = await initializeRepository(dbData)
  try {
    const { results } = await hook.project.upsert(project.id, data.isPrivate
      ? {
          [repo.internalRepoName]: {
            token: data.externalToken ?? '',
            username: data.externalUserName ?? '',
          },
        }
      : undefined,
    )
    await addLogs('Create Repository', results, userId, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services lors de la création du dépôt')
    }

    return repo
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error('Echec de la création du dépôt')
  }
}

export const updateRepository = async (
  {
    repositoryId,
    data,
    userId,
    requestId,
  }: {
    repositoryId: Repository['id'],
    data: Partial<UpdateRepositoryBody>,
    userId: User['id'],
    requestId: string,
  }) => {
  try {
    const repository = await getRepositoryByIdQuery(repositoryId)
    const project = await getProjectInfosOrThrow(repository.projectId)
    await checkUpsertRepository({ project, userId })

    const dbData = { ...data }
    delete dbData.externalToken
    const repo = await updateRepositoryQuery(repositoryId, dbData)

    const { results } = await hook.project.upsert(project.id, {
      [repo.internalRepoName]: {
        username: repo.externalUserName ?? '',
        token: data.externalToken ?? '',
      },
    })
    await addLogs('Update Repository', results, userId, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à la mise à jour du dépôt')
    }

    return repo
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error('Echec de la mise à jour du dépôt')
  }
}

export const deleteRepository = async ({
  repositoryId,
  userId,
  requestId,
}: {
  repositoryId: Repository['id'],
  userId: User['id'],
  requestId: string,
},
) => {
  try {
    const repository = await getRepositoryByIdQuery(repositoryId)
    const project = await getProjectInfosOrThrow(repository.projectId)

    await checkUpsertRepository({ project, userId, minRole: 'owner' })

    await deleteRepositoryQuery(repositoryId)

    const { results } = await hook.project.upsert(project.id)
    await addLogs('Delete Repository', results, userId, requestId)
    if (results.failed) {
      throw new UnprocessableContentError('Echec des services à la suppression du dépôt')
    }
  } catch (error) {
    if (error instanceof DsoError) throw error
    throw new Error('Echec de la mise à jour du dépôt')
  }
}
