import type { AdminRole, ClusterObject, Config, PluginResult, Project, ProjectLite, ProjectMember, StepCall, UniqueRepo, ZoneObject } from '@cpn-console/hooks'
import type { GitlabClient, GitlabMirrorCredsOutput, GitlabMirrorTriggerTokenOutput, VaultKvClient } from '@cpn-console/miracle'
import type { GitlabProjectApi } from './class.js'
import type { VaultSecrets } from './utils.js'
import { okStatus, specificallyDisabled } from '@cpn-console/hooks'
import {
  alchemy,
  GitlabCommit,
  GitlabGroup,
  GitlabGroupCustomAttribute,
  GitlabGroupMember,
  GitlabHttpError,
  GitlabMirrorCreds,
  GitlabMirrorTriggerToken,
  GitlabProject,
  GitlabProjectCustomAttribute,
  GitlabUser,
  GitlabUserCustomAttribute,
  prismaStateStore,
  Resource,
  VaultKvSecret,
} from '@cpn-console/miracle'
import config from './config.js'
import { groupRootCustomAttributeKey, infraGroupCustomAttributeKey, managedByConsoleCustomAttributeKey, projectGroupCustomAttributeKey, userIdCustomAttributeKey } from './custom-attributes.js'
import {
  DEFAULT_ADMIN_GROUP_PATH,
  DEFAULT_AUDITOR_GROUP_PATH,
} from './infos.js'
import { getGroupAccessLevel } from './members.js'
import { provisionMirror } from './project.js'
import { createUsername, getUser } from './user.js'
import { cleanGitlabError, getClient, getGroupRootId, infraAppsRepoName, internalMirrorRepoName } from './utils.js'

interface VaultProjectApiLike {
  write: (body: object, path?: string) => Promise<unknown>
  read: (path?: string, options?: { throwIfNoEntry: boolean }) => Promise<{ data: unknown } | undefined>
  destroy: (path?: string) => Promise<unknown>
}

function isVaultProjectApiLike(api: unknown): api is VaultProjectApiLike {
  if (typeof api !== 'object' || api === null) return false
  return (
    'write' in api && typeof (api as { write?: unknown }).write === 'function'
    && 'read' in api && typeof (api as { read?: unknown }).read === 'function'
    && 'destroy' in api && typeof (api as { destroy?: unknown }).destroy === 'function'
  )
}

function vaultProjectApiToKvClient(vaultProjectApi: VaultProjectApiLike): VaultKvClient {
  return {
    write: async (path, data) => {
      await vaultProjectApi.write(data, path)
    },
    read: (path, opts) => vaultProjectApi.read(path, { throwIfNoEntry: opts?.throwIfNoEntry ?? false }),
    destroy: async (path) => {
      await vaultProjectApi.destroy(path)
    },
  }
}

interface ResourceContext<Output> {
  phase: unknown
  output?: Output
  create: (output: Output) => any
  destroy: () => any
}

const GitlabMirrorProvisioned = Resource('gitlab:MirrorProvisioned', async function (this: ResourceContext<{ repoId: number }>, _id: string, props: { client: GitlabClient, repoId: number }) {
  const phase = this.phase as string
  if (phase !== 'create' && phase !== 'update') throw new Error(`Unexpected phase: ${phase}`)
  try {
    await props.client.repositoryFilesShow(props.repoId, '.gitlab-ci.yml', 'main')
    return this.create({ repoId: props.repoId })
  } catch (err) {
    if (err instanceof GitlabHttpError && err.status === 404) {
      await provisionMirror(props.repoId)
      return this.create({ repoId: props.repoId })
    }
    throw err
  }
})

const urnRegexp = /:\/\/(.*)/s

function assertHasOutput<T>(resource: unknown, name: string): asserts resource is { output: T } {
  if (typeof resource !== 'object' || resource === null || !('output' in resource)) {
    throw new Error(`${name} did not return an output-bearing resource`)
  }
}

async function runGitlabProjectStack(client: GitlabClient, vault: VaultKvClient, project: Project, hookConfig: Config) {
  const scopeName = `project-${project.slug}`
  return alchemy.run(scopeName, { phase: 'up', stateStore: prismaStateStore() }, async () => {
    const parentId = await getGroupRootId(true)

    await GitlabGroupCustomAttribute(`group-root-dir-${project.slug}`, {
      client,
      groupId: parentId,
      key: groupRootCustomAttributeKey,
      value: config().projectsRootDir,
    })
    await GitlabGroupCustomAttribute(`group-root-managed-${project.slug}`, {
      client,
      groupId: parentId,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    const groupResource = await GitlabGroup(`group-${project.slug}`, {
      client,
      name: project.slug,
      path: project.slug,
      parentId,
    })
    assertHasOutput<{ id: number }>(groupResource, 'GitlabGroup')

    await GitlabGroupCustomAttribute(`group-project-slug-${project.slug}`, {
      client,
      groupId: groupResource.output.id,
      key: projectGroupCustomAttributeKey,
      value: project.slug,
    })
    await GitlabGroupCustomAttribute(`group-managed-${project.slug}`, {
      client,
      groupId: groupResource.output.id,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    const infraAppsRepoResource = await GitlabProject(`repo-${project.slug}-${infraAppsRepoName}`, {
      client,
      name: infraAppsRepoName,
      path: infraAppsRepoName,
      namespaceId: groupResource.output.id,
    })
    assertHasOutput<{ id: number }>(infraAppsRepoResource, 'GitlabProject(infraAppsRepo)')

    await GitlabProjectCustomAttribute(`repo-managed-${project.slug}-${infraAppsRepoName}`, {
      client,
      projectId: infraAppsRepoResource.output.id,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    void infraAppsRepoResource

    const mirrorRepoResource = await GitlabProject(`repo-${project.slug}-${internalMirrorRepoName}`, {
      client,
      name: internalMirrorRepoName,
      path: internalMirrorRepoName,
      namespaceId: groupResource.output.id,
    })
    assertHasOutput<{ id: number }>(mirrorRepoResource, 'GitlabProject(mirrorRepo)')

    await GitlabProjectCustomAttribute(`repo-managed-${project.slug}-${internalMirrorRepoName}`, {
      client,
      projectId: mirrorRepoResource.output.id,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    await GitlabMirrorProvisioned(`mirror-provision-${project.slug}`, { client, repoId: mirrorRepoResource.output.id })

    const mirrorCredsResource = await GitlabMirrorCreds(`mirror-creds-${project.slug}`, {
      client,
      vault,
      groupId: groupResource.output.id,
      tokenName: `${project.slug}-bot`,
    })
    assertHasOutput<GitlabMirrorCredsOutput>(mirrorCredsResource, 'GitlabMirrorCreds')

    const triggerTokenResource = await GitlabMirrorTriggerToken(`mirror-trigger-${project.slug}`, {
      client,
      vault,
      repoId: mirrorRepoResource.output.id,
      description: 'mirroring-from-external-repo',
    })
    assertHasOutput<GitlabMirrorTriggerTokenOutput>(triggerTokenResource, 'GitlabMirrorTriggerToken')

    await VaultKvSecret(`vault-gitlab-${project.slug}`, {
      client: vault,
      path: 'GITLAB',
      data: {
        PROJECT_SLUG: project.slug,
        GIT_MIRROR_PROJECT_ID: triggerTokenResource.output.repoId,
        GIT_MIRROR_TOKEN: triggerTokenResource.output.token,
      },
    })

    for (const repo of project.repositories) {
      const repoResource: unknown = await GitlabProject(`repo-${project.slug}-${repo.internalRepoName}`, {
        client,
        name: repo.internalRepoName,
        path: repo.internalRepoName,
        namespaceId: groupResource.output.id,
        ciConfigPath: repo.externalRepoUrl ? '.gitlab-ci-dso.yml' : undefined,
      })
      assertHasOutput<{ id: number }>(repoResource, 'GitlabProject(repo)')

      await GitlabProjectCustomAttribute(`repo-managed-${project.slug}-${repo.internalRepoName}`, {
        client,
        projectId: repoResource.output.id,
        key: managedByConsoleCustomAttributeKey,
        value: 'true',
      })

      if (repo.externalRepoUrl) {
        const externalRepoUrn = repo.externalRepoUrl.split(urnRegexp)[1]
        const internalRepoUrl = `${config().internalUrl}/${config().projectsRootDir}/${project.slug}/${repo.internalRepoName}.git`
        const mirrorSecretData = {
          GIT_INPUT_URL: externalRepoUrn,
          GIT_INPUT_USER: repo.isPrivate ? repo.newCreds?.username : undefined,
          GIT_INPUT_PASSWORD: repo.isPrivate ? repo.newCreds?.token : undefined,
          GIT_OUTPUT_URL: internalRepoUrl.split(urnRegexp)[1],
          GIT_OUTPUT_USER: mirrorCredsResource.output.MIRROR_USER,
          GIT_OUTPUT_PASSWORD: mirrorCredsResource.output.MIRROR_TOKEN,
        }
        await VaultKvSecret(`vault-mirror-${project.slug}-${repo.internalRepoName}`, {
          client: vault,
          path: `${repo.internalRepoName}-mirror`,
          data: mirrorSecretData,
        })
      }
    }

    for (const user of project.users) {
      const gitlabUserResource = await GitlabUser(`user-${user.id}`, {
        client,
        email: user.email,
        username: createUsername(user.email),
        name: `${user.firstName} ${user.lastName}`,
        externUid: user.email,
        provider: 'openid_connect',
      })
      assertHasOutput<{ id: number }>(gitlabUserResource, 'GitlabUser')

      await GitlabUserCustomAttribute(`user-attr-${user.id}`, {
        client,
        userId: gitlabUserResource.output.id,
        key: userIdCustomAttributeKey,
        value: user.id,
      })

      const accessLevel = getGroupAccessLevel(project, user, hookConfig)
      if (accessLevel) {
        await GitlabGroupMember(`member-${user.id}`, {
          client,
          groupId: groupResource.output.id,
          userId: gitlabUserResource.output.id,
          accessLevel,
        })
      }
    }
  })
}

async function runGitlabInfraStack(client: GitlabClient, zoneSlug: string) {
  return alchemy.run(`zone-${zoneSlug}`, { phase: 'up', stateStore: prismaStateStore() }, async () => {
    const rootId = await getGroupRootId(true)

    await GitlabGroupCustomAttribute(`group-root-dir-zone-${zoneSlug}`, {
      client,
      groupId: rootId,
      key: groupRootCustomAttributeKey,
      value: config().projectsRootDir,
    })
    await GitlabGroupCustomAttribute(`group-root-managed-zone-${zoneSlug}`, {
      client,
      groupId: rootId,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    const infraGroupResource = await GitlabGroup('group-infra', {
      client,
      name: 'Infra',
      path: 'infra',
      parentId: rootId,
      createArgs: {
        projectCreationLevel: 'maintainer',
        subgroupCreationLevel: 'owner',
        defaultBranchProtection: 0,
        description: 'Group that hosts infrastructure-as-code repositories for all zones (ArgoCD pull targets).',
      },
    })
    assertHasOutput<{ id: number }>(infraGroupResource, 'GitlabGroup(infra)')

    await GitlabGroupCustomAttribute('group-infra-attr', {
      client,
      groupId: infraGroupResource.output.id,
      key: infraGroupCustomAttributeKey,
      value: 'true',
    })
    await GitlabGroupCustomAttribute('group-infra-managed', {
      client,
      groupId: infraGroupResource.output.id,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    const infraRepoResource = await GitlabProject(`infra-repo-${zoneSlug}`, {
      client,
      name: zoneSlug,
      path: zoneSlug,
      namespaceId: infraGroupResource.output.id,
      description: 'Repository hosting deployment files for this zone.',
    })
    assertHasOutput<{ id: number }>(infraRepoResource, 'GitlabProject(infraRepo)')

    await GitlabProjectCustomAttribute(`infra-repo-managed-${zoneSlug}`, {
      client,
      projectId: infraRepoResource.output.id,
      key: managedByConsoleCustomAttributeKey,
      value: 'true',
    })

    await GitlabCommit(`infra-repo-first-commit-${zoneSlug}`, {
      client,
      projectId: infraRepoResource.output.id,
      branch: 'main',
      commitMessage: 'ci: 🌱 First commit',
      actions: [],
    })
  })
}

async function runGitlabAdminRoleStack(client: GitlabClient, role: AdminRole, flags: { isAdmin?: boolean, isAuditor?: boolean }) {
  return alchemy.run(`admin-role-${role.oidcGroup}`, { phase: 'up', stateStore: prismaStateStore() }, async () => {
    for (const member of role.members) {
      const userResource = await GitlabUser(`admin-role-user-${member.id}`, {
        client,
        email: member.email,
        username: createUsername(member.email),
        name: `${member.firstName} ${member.lastName}`,
        externUid: member.email,
        provider: 'openid_connect',
        isAdmin: flags.isAdmin,
        isAuditor: flags.isAuditor,
      })
      assertHasOutput<{ id: number }>(userResource, 'GitlabUser(adminRole)')

      await GitlabUserCustomAttribute(`admin-role-user-attr-${member.id}`, {
        client,
        userId: userResource.output.id,
        key: userIdCustomAttributeKey,
        value: member.id,
      })
    }
  })
}

// Check
export const checkApi: StepCall<Project> = async (payload) => {
  try {
    const { users } = payload.args
    for (const user of users) {
      const userInfos = await getUser({ ...user, username: createUsername(user.email) })
      if (userInfos?.id === 1) {
        return {
          status: {
            result: 'KO',
            message: 'Gitlab notify: User 1 (root) should not use Console',
          },
        }
      }
    }

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const getDsoProjectSecrets: StepCall<ProjectLite> = async (payload) => {
  try {
    if (!specificallyDisabled(payload.config.gitlab?.displayTriggerHint)) {
      // TODO déplacer les secrets dans un dossier pour tout lister plutôt que de sélectionner dans le code
      const gitlab = (await payload.apis.vault.read('GITLAB')).data as VaultSecrets['GITLAB']
      /* eslint-disable no-template-curly-in-string */
      const curlCommand = [
        'curl -X POST --fail',
        '-F token=\${GIT_MIRROR_TOKEN}',
        '-F ref=main',
        '-F variables[GIT_BRANCH_DEPLOY]=\${BRANCH_TO_SYNC}',
        '-F variables[PROJECT_NAME]=\${REPOSITORY_NAME}',
        `"${config().publicUrl}/api/v4/projects/${gitlab.GIT_MIRROR_PROJECT_ID}/trigger/pipeline"`,
      ]
      /* eslint-enable */
      const secrets: Record<string, string> = {
        GIT_MIRROR_PROJECT_ID: String(gitlab.GIT_MIRROR_PROJECT_ID),
        GIT_MIRROR_TOKEN: gitlab.GIT_MIRROR_TOKEN,
        'CURL COMMAND': curlCommand.join(' \\\n    '),
      }

      return {
        status: {
          result: 'OK',
          message: 'secret retrieved',
        },
        secrets,
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'This feature is disabled',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'OK',
        message: 'No secrets found for this project',
      },
    }
  }
}

export const upsertDsoProject: StepCall<Project> = async (payload) => {
  const returnResult: PluginResult = {
    status: {
      result: 'OK',
    },
  }
  try {
    const project = payload.args
    const vaultApi: unknown = payload.apis.vault
    if (!isVaultProjectApiLike(vaultApi)) throw new Error('Vault API is missing or incompatible for Gitlab plugin')
    const vaultClient = vaultProjectApiToKvClient(vaultApi)

    await runGitlabProjectStack(getClient(), vaultClient, project, payload.config)

    return returnResult
  } catch (error) {
    returnResult.error = cleanGitlabError(error)
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Can\'t reconcile please inspect logs'
    return returnResult
  }
}

export const deleteDsoProject: StepCall<Project> = async (_payload) => {
  try {
    return {
      status: {
        result: 'OK',
        message: 'No-op (non-destructive mode)',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

export const syncRepository: StepCall<UniqueRepo> = async (payload) => {
  const targetRepo = payload.args.repo
  const gitlabApi = payload.apis.gitlab
  try {
    await gitlabApi.triggerMirror(targetRepo.internalRepoName, targetRepo.syncAllBranches, targetRepo.branchName)
    return {
      status: {
        result: 'OK',
        message: 'Ci launched',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'Failed to trigger sync',
      },
    }
  }
}

export const upsertZone: StepCall<ZoneObject> = async (payload) => {
  const returnResult: PluginResult = okStatus
  try {
    await runGitlabInfraStack(getClient(), payload.args.slug)
    return returnResult
  } catch (error) {
    returnResult.error = cleanGitlabError(error)
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Can\'t reconcile please inspect logs'
    return returnResult
  }
}

export const deleteZone: StepCall<ZoneObject> = async (_payload) => {
  try {
    return {
      status: {
        result: 'OK',
        message: 'No-op (non-destructive mode)',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'Can\'t reconcile please inspect logs',
      },
    }
  }
}

export const commitFiles: StepCall<UniqueRepo | Project | ClusterObject | ZoneObject> = async (payload) => {
  const returnResult = payload.results.gitlab
  try {
    const filesUpdated = await payload.apis.gitlab.commitFiles()

    returnResult.status.message = `${filesUpdated} file${filesUpdated > 1 ? 's' : ''} updated`
    return returnResult
  } catch (error) {
    returnResult.error = cleanGitlabError(error)
    returnResult.status.result = 'KO'
    returnResult.status.message = 'Failed to commit files'
    return returnResult
  }
}

export const upsertAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.gitlab?.adminGroupPath ?? DEFAULT_ADMIN_GROUP_PATH
    const auditorGroupPath = payload.config.gitlab?.auditorGroupPath ?? DEFAULT_AUDITOR_GROUP_PATH

    const isAdmin = role.oidcGroup === adminGroupPath ? true : undefined
    const isAuditor = role.oidcGroup === auditorGroupPath ? true : undefined

    if (isAdmin === undefined && isAuditor === undefined) {
      return {
        status: {
          result: 'OK',
          message: 'Not a managed role for GitLab plugin',
        },
      }
    }

    await runGitlabAdminRoleStack(getClient(), role, { isAdmin, isAuditor })

    return {
      status: {
        result: 'OK',
        message: 'Members synced',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'An error occured while syncing admin role',
      },
    }
  }
}

export const deleteAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.gitlab?.adminGroupPath ?? DEFAULT_ADMIN_GROUP_PATH
    const auditorGroupPath = payload.config.gitlab?.auditorGroupPath ?? DEFAULT_AUDITOR_GROUP_PATH

    const isAdmin = role.oidcGroup === adminGroupPath ? false : undefined
    const isAuditor = role.oidcGroup === auditorGroupPath ? false : undefined

    if (isAdmin === undefined && isAuditor === undefined) {
      return {
        status: {
          result: 'OK',
          message: 'Not a managed role for GitLab plugin',
        },
      }
    }

    await runGitlabAdminRoleStack(getClient(), role, { isAdmin, isAuditor })

    return {
      status: {
        result: 'OK',
        message: 'Admin role deleted and members synced',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'An error occured while deleting admin role',
      },
    }
  }
}

export const upsertProjectMember: StepCall<ProjectMember> = async (payload) => {
  const member = payload.args
  const { gitlab: _gitlabApi } = payload.apis as { gitlab: GitlabProjectApi } // TODO: apis is never type for some resaon

  try {
    const vaultApi: unknown = payload.apis.vault
    if (!isVaultProjectApiLike(vaultApi)) throw new Error('Vault API is missing or incompatible for Gitlab plugin')
    const vaultClient = vaultProjectApiToKvClient(vaultApi)
    await runGitlabProjectStack(getClient(), vaultClient, member.project, payload.config)

    return {
      status: {
        result: 'OK',
        message: 'Member synced',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'An error happened while syncing project member',
      },
    }
  }
}

export const deleteProjectMember: StepCall<ProjectMember> = async (_payload) => {
  try {
    return {
      status: {
        result: 'OK',
        message: 'No-op (non-destructive mode)',
      },
    }
  } catch (error) {
    return {
      error: cleanGitlabError(error),
      status: {
        result: 'KO',
        message: 'An error happened while deleting project member',
      },
    }
  }
}
