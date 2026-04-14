import type { Project, Repository } from '@cpn-console/hooks'
import type { CondensedProjectSchema, ProjectSchema } from '@cpn-console/miracle'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import type { GitlabProjectApi } from './class.js'
import { shallowEqual } from '@cpn-console/shared'
import { pluginManagedTopic } from './class.js'
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
        && !project.repositories.some(repo => repo.internalRepoName === gitlabRepository.name)))
      .map(gitlabRepository => gitlabApi.deleteRepository(gitlabRepository.id, gitlabRepository.path_with_namespace)),
    // create missing repositories
    ...project.repositories.map(repo => ensureRepositoryExists(gitlabRepositories, repo, gitlabApi, projectMirrorCreds, vaultApi)),
  ]

  if (!gitlabRepositories.some(repo => repo.name === infraAppsRepoName)) {
    promises.push(
      gitlabApi.createEmptyProjectRepository({ repoName: infraAppsRepoName, clone: false }),
    )
  }
  if (!gitlabRepositories.some(repo => repo.name === internalMirrorRepoName)) {
    promises.push(
      gitlabApi.createEmptyProjectRepository({ repoName: internalMirrorRepoName, clone: false })
        .then(mirrorRepo => provisionMirror(mirrorRepo.id)),
    )
  }

  await Promise.all(promises)
}

const urnRegexp = /:\/\/(.*)/s

async function ensureRepositoryExists(gitlabRepositories: CondensedProjectSchema[], repository: Repository, gitlabApi: GitlabProjectApi, projectMirrorCreds: ProjectMirrorCreds, vaultApi: VaultProjectApi) {
  const gitlabRepository: CondensedProjectSchema | ProjectSchema | void = gitlabRepositories.find(gitlabRepository => gitlabRepository.name === repository.internalRepoName)
  const externalRepoUrn = repository.externalRepoUrl.split(urnRegexp)[1]
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

  const mirrorSecretData = {
    GIT_INPUT_URL: externalRepoUrn,
    GIT_INPUT_USER: repository.isPrivate
      ? (repository.newCreds?.username || gitInputUser)
      : undefined,
    GIT_INPUT_PASSWORD: repository.isPrivate
      ? (repository.newCreds?.token || gitInputPassword)
      : undefined,
    GIT_OUTPUT_URL: internalRepoUrl.split(urnRegexp)[1],
    GIT_OUTPUT_USER: projectMirrorCreds.botAccount,
    GIT_OUTPUT_PASSWORD: projectMirrorCreds.token,
  }
  if (
    !currentVaultSecret?.data
    || !shallowEqual(mirrorSecretData, currentVaultSecret.data)
  ) {
    await vaultApi.write(mirrorSecretData, vaultCredsPath)
  }
}
