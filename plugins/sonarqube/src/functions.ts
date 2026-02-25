import type { AdminRole, Project, StepCall } from '@cpn-console/hooks'
import { generateProjectKey, parseError, specificallyEnabled } from '@cpn-console/hooks'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { addUserToGroup, ensureGroupExists, getGroupMembers, removeUserFromGroup } from './group.js'
import { formatGroupName } from './utils.js'
import type { VaultSonarSecret } from './tech.js'
import { getAxiosInstance } from './tech.js'
import { ensureUserExists, getUser } from './user.js'
import { createDsoRepository, deleteDsoRepository, ensureRepositoryConfiguration, files, findSonarProjectsForDsoProjects } from './project.js'
import { DEFAULT_ADMIN_GROUP_PATH, DEFAULT_READONLY_GROUP_PATH } from './infos.js'

const PLATFORM_ADMIN_TEMPLATE_NAME = 'Default platform admin template'
const PLATFORM_READONLY_TEMPLATE_NAME = 'Default platform readonly template'

const platformAdminPermissions = [
  'admin',
  'codeviewer',
  'issueadmin',
  'scan',
  'securityhotspotadmin',
  'user',
] as const

const platformReadonlyPermissions = [
  'codeviewer',
  'user',
] as const

export const upsertAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.sonarqube?.adminGroupPath ?? DEFAULT_ADMIN_GROUP_PATH
    const readonlyGroupPath = payload.config.sonarqube?.readonlyGroupPath ?? DEFAULT_READONLY_GROUP_PATH

    let managedGroupPath: string | undefined

    if (role.oidcGroup === adminGroupPath) {
      managedGroupPath = formatGroupName(adminGroupPath)
      await ensureAdminTemplateExists()
      await ensureGroupExists(managedGroupPath)
      await setTemplateGroupPermissions(managedGroupPath, platformAdminPermissions, PLATFORM_ADMIN_TEMPLATE_NAME)
    } else if (role.oidcGroup === readonlyGroupPath) {
      managedGroupPath = formatGroupName(readonlyGroupPath)
      await ensureReadonlyTemplateExists()
      await ensureGroupExists(managedGroupPath)
      await setTemplateGroupPermissions(managedGroupPath, platformReadonlyPermissions, PLATFORM_READONLY_TEMPLATE_NAME)
    }

    if (!managedGroupPath) {
      return {
        status: {
          result: 'OK',
          message: 'Not a managed role for SonarQube plugin',
        },
      }
    }

    const groupMembers = await getGroupMembers(managedGroupPath)

    await Promise.all([
      ...role.members.map((member) => {
        if (!groupMembers.includes(member.email)) {
          return addUserToGroup(managedGroupPath, member.email)
            .catch((error) => {
              console.warn(`Failed to add user ${member.email} to group ${managedGroupPath}`, error)
            })
        }
        return undefined
      }),
      ...groupMembers.map((memberEmail) => {
        if (!role.members.some(m => m.email === memberEmail)) {
          if (specificallyEnabled(payload.config.sonarqube?.purge)) {
            return removeUserFromGroup(managedGroupPath, memberEmail)
              .catch((error) => {
                console.warn(`Failed to remove user ${memberEmail} from group ${managedGroupPath}`, error)
              })
          }
        }
        return undefined
      }),
    ])

    return {
      status: {
        result: 'OK',
        message: 'Admin role synced',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'An error occured while syncing admin role',
      },
    }
  }
}

async function setTemplateGroupPermissions(groupName: string, permissions: readonly string[], templateName: string) {
  const axiosInstance = getAxiosInstance()
  await Promise.all(permissions.map(permission =>
    axiosInstance({
      method: 'post',
      params: {
        groupName,
        templateName,
        permission,
      },
      url: 'permissions/add_group_to_template',
    }),
  ))
}

async function ensureAdminTemplateExists() {
  const axiosInstance = getAxiosInstance()

  // Create Admin Template
  await axiosInstance({
    method: 'post',
    params: { name: PLATFORM_ADMIN_TEMPLATE_NAME },
    url: 'permissions/create_template',
    validateStatus: code => [200, 400].includes(code),
  })

  // Add Project Creator and sonar-administrators to Admin Template
  await Promise.all(platformAdminPermissions.map(permission =>
    axiosInstance({
      method: 'post',
      params: {
        templateName: PLATFORM_ADMIN_TEMPLATE_NAME,
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    }),
  ))
}

async function ensureReadonlyTemplateExists() {
  const axiosInstance = getAxiosInstance()

  // Create Readonly Template
  await axiosInstance({
    method: 'post',
    params: { name: PLATFORM_READONLY_TEMPLATE_NAME },
    url: 'permissions/create_template',
    validateStatus: code => [200, 400].includes(code),
  })

  // Add Project Creator and sonar-administrators to Readonly Template
  await Promise.all(platformReadonlyPermissions.map(permission =>
    axiosInstance({
      method: 'post',
      params: {
        templateName: PLATFORM_READONLY_TEMPLATE_NAME,
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    }),
  ))

  // Set Readonly Template as Default
  await axiosInstance({
    method: 'post',
    params: {
      templateName: PLATFORM_READONLY_TEMPLATE_NAME,
    },
    url: 'permissions/set_default_template',
  })
}

export const upsertProject: StepCall<Project> = async (payload) => {
  try {
    const project = payload.args
    const {
      vault: vaultApi,
      keycloak: keycloakApi,
    } = payload.apis
    const {
      slug: projectSlug,
    } = project
    const username = project.slug
    const keycloakGroupPath = await keycloakApi.getProjectGroupPath()
    const sonarGroupPath = formatGroupName(keycloakGroupPath)
    const sonarRepositories = await findSonarProjectsForDsoProjects(projectSlug)

    await Promise.all([
      ensureUserAndVault(vaultApi, username, projectSlug),
      ensureGroupExists(sonarGroupPath),

      // Remove excess repositories
      ...sonarRepositories
        .filter(sonarRepository => !project.repositories.some(repo => repo.internalRepoName === sonarRepository.repository))
        .map(sonarRepository => deleteDsoRepository(sonarRepository.key)),

      // Create or configure needed repos
      ...project.repositories.map(async (repository) => {
        const projectKey = generateProjectKey(projectSlug, repository.internalRepoName)
        if (!sonarRepositories.some(sonarRepository => sonarRepository.repository === repository.internalRepoName)) {
          await createDsoRepository(projectSlug, repository.internalRepoName)
        }
        await ensureRepositoryConfiguration(projectKey, username, sonarGroupPath)
      }),
    ])

    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'WARNING',
        message: 'Failed to reconcile',
      },
      errors: {
        main: parseError(error),
      },
    }
  }
}

export const setVariables: StepCall<Project> = async (payload) => {
  const returnResponse = payload.results.sonarqube
  try {
    const project = payload.args
    const {
      slug: projectSlug,
    } = project
    const { gitlab: gitlabApi } = payload.apis

    const sonarSecret = await payload.apis.vault.read('SONAR')
    const listGroupVars = await gitlabApi.getGitlabGroupVariables()
    await Promise.all([
      // Sonar vars saving in CI (repositories)
      ...project.repositories.map(async (repo) => {
        const projectKey = generateProjectKey(projectSlug, repo.internalRepoName)
        const repoId = await payload.apis.gitlab.getProjectId(repo.internalRepoName)
        if (!repoId) {
          throw new Error(`Unable to find GitLab project for repository ${repo.internalRepoName}`)
        }
        const listVars = await gitlabApi.getGitlabRepoVariables(repoId)
        return [
          await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
            key: 'PROJECT_KEY',
            masked: false,
            protected: false,
            value: projectKey,
            variable_type: 'env_var',
            environment_scope: '*',
          }),
          await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
            key: 'PROJECT_NAME',
            masked: false,
            protected: false,
            value: `${projectSlug}-${repo.internalRepoName}`,
            variable_type: 'env_var',
            environment_scope: '*',
          }),
          await gitlabApi.setGitlabRepoVariable(repoId, listVars, {
            variable_type: 'file',
            key: 'SONAR_PROJECT_PROPERTIES',
            masked: false,
            protected: false,
            value: files['sonar-project.properties'](projectKey),
            environment_scope: '*',
          }),
        ]
      }),
      // Sonar vars saving in CI (group)
      gitlabApi.setGitlabGroupVariable(listGroupVars, {
        key: 'SONAR_TOKEN',
        masked: true,
        protected: false,
        value: sonarSecret.data.SONAR_TOKEN,
        variable_type: 'env_var',
      }),
    ])

    if (payload.results.sonarqube.status.result === 'WARNING') {
      returnResponse.status.message = `main message: ${payload.results.sonarqube.status.message}, post message: OK`
    }
    return returnResponse
  } catch (error) {
    returnResponse.status.result = 'WARNING'
    returnResponse.status.message = `main message: ${payload.results.sonarqube.status.message}, post message: Failed to reconcile`
    returnResponse.errors = {
      ...returnResponse.errors,
      post: parseError(error),
    }
    return returnResponse
  }
}

export const deleteProject: StepCall<Project> = async (payload) => {
  const axiosInstance = getAxiosInstance()

  const project = payload.args
  const {
    slug: projectSlug,
  } = project
  const username = projectSlug
  try {
    const sonarRepositories = await findSonarProjectsForDsoProjects(projectSlug)
    await Promise.all(sonarRepositories.map(repo => deleteRepo(repo.key)))
    const user = await getUser(username)
    if (!user) {
      return {
        status: {
          result: 'OK',
          message: 'Already missing',
        },
      }
    }
    await axiosInstance({
      url: 'users/deactivate',
      params: {
        login: username,
        anonymize: true,
      },
      method: 'post',
    })
    return {
      status: {
        result: 'OK',
        message: 'User anonymized',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Failed',
      },
    }
  }
}

async function deleteRepo(projectKey: string) {
  return getAxiosInstance()({
    url: 'projects/delete',
    params: {
      project: projectKey,
    },
    method: 'post',
  })
}

async function ensureUserAndVault(vaultApi: VaultProjectApi, username: string, projectSlug: string) {
  const vaultUserSecret = await vaultApi.read('SONAR', { throwIfNoEntry: false }) as VaultSonarSecret | undefined
  const newUserSecret = await ensureUserExists(username, projectSlug, vaultUserSecret)
  if (newUserSecret) await vaultApi.write(newUserSecret, 'SONAR')
}
