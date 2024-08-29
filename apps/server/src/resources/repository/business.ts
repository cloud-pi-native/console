import type { Repository, User } from '@prisma/client'
import type { CreateRepositoryBody, Project, UpdateRepositoryBody } from '@cpn-console/shared'
import { addLogs, deleteRepository as deleteRepositoryQuery, getProjectInfosAndRepos, getProjectInfosOrThrow, getProjectRepositories as getProjectRepositoriesQuery, getRepositoryById as getRepositoryByIdQuery, initializeRepository, updateRepository as updateRepositoryQuery } from '@/resources/queries-index.js'
import { checkLocked } from '@/utils/controller.js'
import { BadRequest400, ErrorResType, NotFound404, Unprocessable422 } from '@/utils/errors.js'
import { hook } from '@/utils/hook-wrapper.js'

export async function getRepositoryById(projectId: Project['id'], repositoryId: Repository['id']) {
  const project = await getProjectAndCheckRole(projectId)
  if (project instanceof ErrorResType) return project

  const repository = project.repositories?.find(repo => repo.id === repositoryId)
  if (!repository) return new NotFound404()
  return repository
}

export async function getProjectRepositories(projectId: Project['id']) {
  return getProjectRepositoriesQuery(projectId)
}

export async function getProjectAndCheckRole(projectId: Project['id']) {
  const project = await getProjectInfosAndRepos(projectId)
  if (!project) return new BadRequest400(`Le projet ayant pour id ${projectId} n'existe pas`)
  return project
}

export async function syncRepository({
  repositoryId,
  userId,
  syncAllBranches,
  branchName,
  requestId,
}: {
  repositoryId: Repository['id']
  userId: User['id']
  syncAllBranches: boolean
  branchName?: string
  requestId: string
}) {
  const repository = await getRepositoryByIdQuery(repositoryId)
  const project = await getProjectInfosOrThrow(repository.projectId)
  await checkUpsertRepository(project)

  const hookReply = await hook.misc.syncRepository(repositoryId, { syncAllBranches, branchName })
  await addLogs('Sync Repository', hookReply, userId, requestId)
  if (hookReply.failed) {
    return new Unprocessable422('Echec des services à la synchronisation du dépôt')
  }
  return null
}

export async function checkUpsertRepository({ locked }: { locked: Project['locked'] }) {
  const errorMessage = checkLocked({ locked })
  if (errorMessage) return new BadRequest400(errorMessage)
}

export async function createRepository({
  data,
  userId,
  requestId,
}: {
  data: CreateRepositoryBody
  userId: User['id']
  requestId: string
}) {
  const project = await getProjectInfosAndRepos(data.projectId)
  if (!project) return new BadRequest400(`Le projet ayant pour id ${data.projectId} n'existe pas`)
  const checkResult = await checkUpsertRepository(project)

  if (checkResult instanceof ErrorResType) return checkResult

  if (project.repositories?.find(repo => repo.internalRepoName === data.internalRepoName)) return new BadRequest400(`Le nom du dépôt interne ${data.internalRepoName} existe déjà en base pour ce projet`)
  const dbData = { ...data, isInfra: !!data.isInfra, isPrivate: !!data.isPrivate }
  delete dbData.externalToken

  const repo = await initializeRepository(dbData)
  const { results } = await hook.project.upsert(project.id, data.isPrivate
    ? {
        [repo.internalRepoName]: {
          token: data.externalToken ?? '',
          username: data.externalUserName ?? '',
        },
      }
    : undefined)
  await addLogs('Create Repository', results, userId, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services lors de la création du dépôt')
  }

  return repo
}

export async function updateRepository({
  repositoryId,
  data,
  userId,
  requestId,
}: {
  repositoryId: Repository['id']
  data: Partial<UpdateRepositoryBody>
  userId: User['id']
  requestId: string
}) {
  const repository = await getRepositoryByIdQuery(repositoryId)
  const project = await getProjectInfosOrThrow(repository.projectId)
  const checkResult = await checkUpsertRepository(project)
  if (checkResult instanceof ErrorResType) return checkResult

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
    return new Unprocessable422('Echec des services à la mise à jour du dépôt')
  }

  return repo
}

export async function deleteRepository({
  repositoryId,
  userId,
  requestId,
}: {
  repositoryId: Repository['id']
  userId: User['id']
  requestId: string
}) {
  const repository = await getRepositoryByIdQuery(repositoryId)
  const project = await getProjectInfosOrThrow(repository.projectId)

  const checkResult = await checkUpsertRepository(project)
  if (checkResult instanceof ErrorResType) return checkResult

  await deleteRepositoryQuery(repositoryId)

  const { results } = await hook.project.upsert(project.id)
  await addLogs('Delete Repository', results, userId, requestId)
  if (results.failed) {
    return new Unprocessable422('Echec des services à la suppression du dépôt')
  }
  return null
}
