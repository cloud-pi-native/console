import type { CreateRepositoryBodyV2, Repo, UpdateRepositoryBodyV2 } from '@cpn-console/shared'
import { fakeToken } from '@cpn-console/shared'

// Ce que remonte RepoForm : un dépôt partiel, augmenté de la clé de formulaire `isStandalone`.
export type RepoFormResult = Partial<Repo> & { isStandalone?: boolean }

export function toCreateRepositoryBody(repo: RepoFormResult): CreateRepositoryBodyV2 {
  const repositoryBase = {
    internalRepoName: repo.internalRepoName ?? '',
    externalRepoUrl: repo.externalRepoUrl,
    isInfra: !!repo.isInfra,
    deployRevision: repo.deployRevision,
    deployPath: repo.deployPath,
    helmValuesFiles: repo.helmValuesFiles,
  }

  return repo.isPrivate
    ? { ...repositoryBase, isPrivate: true, externalUserName: repo.externalUserName ?? '', externalToken: repo.externalToken ?? '' }
    : { ...repositoryBase, isPrivate: false }
}

export function toUpdateRepositoryBody(repo: RepoFormResult): UpdateRepositoryBodyV2 {
  const { externalToken, id: _id, projectId: _projectId, createdAt: _createdAt, updatedAt: _updatedAt, internalRepoName: _internalRepoName, isStandalone: _isStandalone, ...repositoryFields } = repo

  return {
    ...repositoryFields,
    ...externalToken && externalToken !== fakeToken && { externalToken },
  }
}
