import type { Project, Repository } from '@cpn-console/hooks'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import type { CondensedProjectSchema, ProjectSchema } from '@gitbeaker/rest'
import { shallowEqual } from '@cpn-console/shared'
import { type GitlabProjectApi, pluginManagedTopic } from './class.js'
import { provisionMirror } from './project.js'
import { infraAppsRepoName, internalMirrorRepoName } from './utils.js'

interface ProjectMirrorCreds {
  botAccount: string
  token: string
}

export async function ensureRepositories(gitlabApi: GitlabProjectApi, project: Project, vaultApi: VaultProjectApi, projectMirrorCreds: ProjectMirrorCreds) {
  const specialRepos = await gitlabApi.getSpecialRepositories()
  const gitlabRepositories = await gitlabApi.listRepositories()

  const promises: Promise<any>[] = [
    // delete excess repositories
    ...gitlabRepositories
      .filter(gitlabRepository => (
        !specialRepos.includes(gitlabRepository.name)
        && !gitlabRepository.topics?.includes(pluginManagedTopic)
        && !project.repositories.find(repo => repo.internalRepoName === gitlabRepository.name,
        )))
      .map(gitlabRepository => gitlabApi.deleteRepository(gitlabRepository.id, gitlabRepository.path_with_namespace)),
    // create missing repositories
    ...project.repositories.map(repo => ensureRepositoryExists(gitlabRepositories, repo, gitlabApi, projectMirrorCreds, vaultApi)),
  ]

  if (!gitlabRepositories.find(repo => repo.name === infraAppsRepoName)) {
    promises.push(
      gitlabApi.createEmptyProjectRepository({ repoName: infraAppsRepoName, clone: false }),
    )
  }
  if (!gitlabRepositories.find(repo => repo.name === internalMirrorRepoName)) {
    promises.push(
      gitlabApi.createEmptyProjectRepository({ repoName: internalMirrorRepoName, clone: false })
        .then(mirrorRepo => provisionMirror(mirrorRepo.id)),
    )
  }

  await Promise.all(promises)
}

async function ensureRepositoryExists(gitlabRepositories: CondensedProjectSchema[], repository: Repository, gitlabApi: GitlabProjectApi, projectMirrorCreds: ProjectMirrorCreds, vaultApi: VaultProjectApi) {
  const gitlabRepository: CondensedProjectSchema | ProjectSchema | void = gitlabRepositories.find(gitlabRepository => gitlabRepository.name === repository.internalRepoName)
  const externalRepoUrn = repository.externalRepoUrl.split(/:\/\/(.*)/s)[1]
  const vaultCredsPath = `${repository.internalRepoName}-mirror`
  const currentVaultSecret = await vaultApi.read(vaultCredsPath, { throwIfNoEntry: false })

  if (!gitlabRepository) {
    await gitlabApi.createEmptyProjectRepository({
      repoName: repository.internalRepoName,
      description: undefined,
      clone: !!repository.externalRepoUrl,
    })
  }

  if (!repository.externalRepoUrl) {
    return currentVaultSecret && vaultApi.destroy(vaultCredsPath)
  }

  let gitInputUser: string | undefined
  let gitInputPassword: string | undefined
  if (currentVaultSecret?.data) {
    gitInputUser = currentVaultSecret.data.GIT_INPUT_USER
    gitInputPassword = currentVaultSecret.data.GIT_INPUT_PASSWORD
  }

  const internalRepoUrl = await gitlabApi.getInternalRepoUrl(repository.internalRepoName)

  const { data: gitlabSecret } = await vaultApi.read('tech/GITLAB_MIRROR', { throwIfNoEntry: false })
  const mirrorSecretData = {
    GIT_INPUT_URL: externalRepoUrn,
    GIT_INPUT_USER: repository.isPrivate
      ? (repository.newCreds?.username || gitInputUser)
      : undefined,
    GIT_INPUT_PASSWORD: repository.isPrivate
      ? (repository.newCreds?.token || gitInputPassword)
      : undefined,
    GIT_OUTPUT_URL: internalRepoUrl.split(/:\/\/(.*)/s)[1],
    GIT_OUTPUT_USER: projectMirrorCreds.botAccount,
    GIT_OUTPUT_PASSWORD: projectMirrorCreds.token,
  }

  if (!shallowEqual(mirrorSecretData, gitlabSecret)) {
    await vaultApi.write(mirrorSecretData, vaultCredsPath)
  }
}
