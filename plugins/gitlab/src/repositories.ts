import { Project, Repository } from '@cpn-console/hooks'
import type { GitlabProjectApi } from './class.js'
import { provisionMirror } from './project.js'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/class.js'
import { CondensedProjectSchema, ProjectSchema } from '@gitbeaker/rest'
import { internalMirrorRepoName, shallowEqual } from './utils.js'

type ProjectMirrorCreds = {
  botAccount: string
  token: string
}

export const ensureRepositories = async (gitlabApi: GitlabProjectApi, project: Project, vaultApi: VaultProjectApi, projectMirrorCreds: ProjectMirrorCreds) => {
  const specialRepos = await gitlabApi.getSpecialRepositories()
  const gitlabRepositories = await gitlabApi.listRepositories()
  if (!gitlabRepositories.find(repo => repo.name === internalMirrorRepoName)) {
    const mirrorRepo = await gitlabApi.createEmptyRepository(internalMirrorRepoName)
    await provisionMirror(mirrorRepo.id)
  }

  for (const gitlabRepository of gitlabRepositories) { // delete
    if (specialRepos.includes(gitlabRepository.name)) continue
    if (!project.repositories.find(repo => repo.internalRepoName === gitlabRepository.name)) await gitlabApi.deleteRepository(gitlabRepository.id)
  }

  await Promise.all(project.repositories.map(repo => ensureRepositoryExists(gitlabRepositories, repo, gitlabApi, projectMirrorCreds, vaultApi)))
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
  const currentVaultCreds = await vaultApi.read(vaultCredsPath, { throwIfNoEntry: false })

  if (!gitlabRepository) {
    gitlabRepository = await gitlabApi.createCloneRepository(repository.internalRepoName, externalRepoUrn, repository.newCreds) // TODO
  }
  const internalRepoUrl = await gitlabApi.getRepoUrl(repository.internalRepoName)

  const gitlabSecret = await vaultApi.read('tech/GITLAB_MIRROR', { throwIfNoEntry: false })
  const mirrorSecretData = {
    GIT_INPUT_URL: repository.externalRepoUrl,
    GIT_INPUT_USER: repository.newCreds?.username || currentVaultCreds?.GIT_INPUT_USER,
    GIT_INPUT_PASSWORD: repository.newCreds?.token || currentVaultCreds?.GIT_INPUT_PASSWORD,
    GIT_OUTPUT_URL: internalRepoUrl,
    GIT_OUTPUT_USER: projectMirrorCreds.botAccount,
    GIT_OUTPUT_PASSWORD: projectMirrorCreds.token,
  }

  if (!shallowEqual(mirrorSecretData, gitlabSecret)) await vaultApi.write(mirrorSecretData, internalMirrorRepoName)
}
