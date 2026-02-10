import type { AdminRole, Project, StepCall } from '@cpn-console/hooks'
import { generateProjectKey, parseError } from '@cpn-console/hooks'
import { ENABLED } from '@cpn-console/shared'
import type { VaultProjectApi } from '@cpn-console/vault-plugin/types/vault-project-api.js'
import { addUserToGroup, ensureGroupExists, getGroupMembers, removeUserFromGroup } from './group.js'
import type { VaultSonarSecret } from './tech.js'
import { getAxiosInstance } from './tech.js'
import type { SonarUser } from './user.js'
import { ensureUserExists } from './user.js'
import type { SonarPaging } from './project.js'
import { createDsoRepository, deleteDsoRepository, ensureRepositoryConfiguration, files, findSonarProjectsForDsoProjects } from './project.js'

const projectPermissions = [
  'admin',
  'codeviewer',
  'issueadmin',
  'securityhotspotadmin',
  'scan',
  'user',
]

const readonlyProjectPermissions = [
  'codeviewer',
  'user',
  'scan',
  'issueadmin',
  'securityhotspotadmin',
]

export const upsertAdminRole: StepCall<AdminRole> = async (payload) => {
  try {
    const role = payload.args
    const adminGroupPath = payload.config.sonarqube?.adminGroupPath
    const readonlyGroupPath = payload.config.sonarqube?.readonlyGroupPath
    if (!readonlyGroupPath) {
      throw new Error('readonlyGroupPath is required')
    }
    const purgeEnabled = payload.config.sonarqube?.purge === ENABLED
    if (!adminGroupPath) {
      throw new Error('adminGroupPath is required')
    }

    let managedGroupPath: string | undefined

    if (role.oidcGroup === adminGroupPath) {
      managedGroupPath = adminGroupPath
      await ensureAdminTemplateExists(adminGroupPath)
      await ensureGroupExists(adminGroupPath)
      await setTemplateGroupPermissions(adminGroupPath, projectPermissions, adminGroupPath)
    } else if (role.oidcGroup === readonlyGroupPath) {
      managedGroupPath = readonlyGroupPath
      await ensureReadonlyTemplateExists(readonlyGroupPath)
      await ensureGroupExists(readonlyGroupPath)
      await setTemplateGroupPermissions(readonlyGroupPath, readonlyProjectPermissions, readonlyGroupPath)
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
          if (purgeEnabled) {
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

async function setTemplateGroupPermissions(groupName: string, permissions: string[], templateName: string) {
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

async function ensureAdminTemplateExists(adminTemplateName: string) {
  const axiosInstance = getAxiosInstance()

  // Create Admin Template
  await axiosInstance({
    method: 'post',
    params: { name: adminTemplateName },
    url: 'permissions/create_template',
    validateStatus: code => [200, 400].includes(code),
  })

  // Add Project Creator and sonar-administrators to Admin Template
  await Promise.all(projectPermissions.map(permission =>
    axiosInstance({
      method: 'post',
      params: {
        templateName: adminTemplateName,
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    }),
  ))
  await setTemplateGroupPermissions('sonar-administrators', projectPermissions, adminTemplateName)
}

async function ensureReadonlyTemplateExists(readonlyTemplateName: string) {
  const axiosInstance = getAxiosInstance()

  // Create Readonly Template
  await axiosInstance({
    method: 'post',
    params: { name: readonlyTemplateName },
    url: 'permissions/create_template',
    validateStatus: code => [200, 400].includes(code),
  })

  // Add Project Creator and sonar-administrators to Readonly Template
  await Promise.all(projectPermissions.map(permission =>
    axiosInstance({
      method: 'post',
      params: {
        templateName: readonlyTemplateName,
        permission,
      },
      url: 'permissions/add_project_creator_to_template',
    }),
  ))
  await setTemplateGroupPermissions('sonar-administrators', projectPermissions, readonlyTemplateName)

  // Set Readonly Template as Default
  await axiosInstance({
    method: 'post',
    params: {
      templateName: readonlyTemplateName,
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
    const sonarRepositories = await findSonarProjectsForDsoProjects(projectSlug)

    await Promise.all([
      ensureUserAndVault(vaultApi, username, projectSlug),
      ensureGroupExists(keycloakGroupPath),

      // Remove excess repositories
      ...sonarRepositories
        .filter(sonarRepository => !project.repositories.find(repo => repo.internalRepoName === sonarRepository.repository))
        .map(sonarRepository => deleteDsoRepository(sonarRepository.key)),

      // Create or configure needed repos
      ...project.repositories.map(async (repository) => {
        const projectKey = generateProjectKey(projectSlug, repository.internalRepoName)
        if (!sonarRepositories.find(sonarRepository => sonarRepository.repository === repository.internalRepoName)) {
          await createDsoRepository(projectSlug, repository.internalRepoName)
        }
        await ensureRepositoryConfiguration(projectKey, username, keycloakGroupPath)
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
      }).flat(),
      // Sonar vars saving in CI (group)
      await gitlabApi.setGitlabGroupVariable(listGroupVars, {
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
    const users: { paging: SonarPaging, users: SonarUser[] } = (await axiosInstance({
      url: 'users/search',
      params: {
        q: username,
      },
    }))?.data
    const user = users.users.find(u => u.login === username)
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
