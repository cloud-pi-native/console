import { Project, Repository } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.js'
import { provisionMirror } from './project.js'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import { CondensedProjectSchema, ProjectSchema } from '@gitbeaker/rest'
import { infraAppsRepoName, internalMirrorRepoName, shallowEqual } from './utils.js'

type ProjectMirrorCreds = {
  botAccount: string
  token: string
}

export const ensureRepositories = async (gitlabApi: GitlabProjectApi, project: Project, vaultApi: VaultProjectApi, projectMirrorCreds: ProjectMirrorCreds) => {
  const specialRepos = await gitlabApi.getSpecialRepositories()
  const gitlabRepositories = await gitlabApi.listRepositories()

  const promises: Promise<any>[] = [
    // delete excess repositories
    ...gitlabRepositories
      .filter(gitlabRepository => (
        !specialRepos.includes(gitlabRepository.name) &&
        !project.repositories.find(repo => repo.internalRepoName === gitlabRepository.name,
        )))
      .map(gitlabRepository => gitlabApi.deleteRepository(gitlabRepository.id)),
    // create missing repositories
    ...project.repositories.map(repo => ensureRepositoryExists(gitlabRepositories, repo, gitlabApi, projectMirrorCreds, vaultApi)),
  ]

  if (!gitlabRepositories.find(repo => repo.name === infraAppsRepoName)) {
    promises.push(
      gitlabApi.createEmptyRepository(infraAppsRepoName),
    )
  }
  if (!gitlabRepositories.find(repo => repo.name === internalMirrorRepoName)) {
    promises.push(
      gitlabApi.createEmptyRepository(internalMirrorRepoName)
        .then(mirrorRepo => provisionMirror(mirrorRepo.id)),
    )
  }

  await Promise.all(promises)
}

const ensureRepositoryExists = async (
  gitlabRepositories: CondensedProjectSchema[],
  repository: Repository,
  gitlabApi: GitlabProjectApi,
  projectMirrorCreds: ProjectMirrorCreds,
  vaultApi: VaultProjectApi,
) => {
  let gitlabRepository: CondensedProjectSchema | ProjectSchema | void = gitlabRepositories.find(gitlabRepository => gitlabRepository.name === repository.internalRepoName)
  const externalRepoUrn = repository.externalRepoUrl.split(/:\/\/(.*)/s)[1]
  const vaultCredsPath = `${repository.internalRepoName}-mirror`
  const currentVaultSecret = await vaultApi.read(vaultCredsPath, { throwIfNoEntry: false })
  let gitInputUser: string | undefined
  let gitInputPassword: string | undefined
  if (currentVaultSecret?.data) {
    gitInputUser = currentVaultSecret.data.GIT_INPUT_USER
    gitInputPassword = currentVaultSecret.data.GIT_INPUT_PASSWORD
  }

  if (!gitlabRepository) {
    gitlabRepository = await gitlabApi.createCloneRepository(repository.internalRepoName, externalRepoUrn, repository.newCreds ?? { username: currentVaultSecret?.data.GIT_INPUT_USER, token: currentVaultSecret?.data.GIT_INPUT_PASSWORD }) // TODO
  }

  const internalRepoUrl = await gitlabApi.getRepoUrl(repository.internalRepoName)

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
