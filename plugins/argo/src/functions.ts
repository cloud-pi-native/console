import type { EnvironmentCreateArgs, EnvironmentDeleteArgs, PluginResult, StepCall, CreateRepositoryExecArgs, DeleteRepositoryExecArgs } from '@dso-console/hooks'
import { ArgoDestination, addRepoToApplicationProject, createApplicationProject, deleteApplicationProject } from './app-project.js'
import { createApplication, deleteApplication } from './applications.js'
import { generateAppProjectName, generateApplicationName } from './utils.js'

type AppProject = any

export const newEnv: StepCall<EnvironmentCreateArgs> = async (payload) => {
  try {
    const { project, organization, environment, repositories, cluster } = payload.args
    const { roGroup, rwGroup } = payload.results.keycloak
    const { nsName } = payload.results.kubernetes
    const destination = {
      name: cluster.label,
      namespace: nsName,
    }
    const appProjectName = generateAppProjectName(organization, project, environment)
    const appProject = await createApplicationProject({ appProjectName, roGroup, rwGroup, repositories, destination })

    for (const repo of repositories) {
      const applicationName = generateApplicationName(organization, project, environment, repo.internalRepoName)
      await addRepoToApplicationProject({ appProjectName, repoUrl: repo.url })
      await createApplication({ applicationName, appProject, destination, repo })
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Can\'t create env',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteEnv: StepCall<EnvironmentDeleteArgs> = async (payload) => {
  try {
    const { project, organization, environment, repositories } = payload.args

    const appProjectName = generateAppProjectName(organization, project, environment)
    await deleteApplicationProject({ appProjectName })
    for (const repo of repositories) {
      const applicationName = generateApplicationName(organization, project, environment, repo.internalRepoName)
      await deleteApplication({ applicationName, repoUrl: repo.url })
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

const nothingStatus: PluginResult = {
  status: {
    result: 'OK',
    message: 'Not an infra repository',
  },
}

export const newRepo: StepCall<CreateRepositoryExecArgs> = async (payload) => {
  try {
    const repo = { internalRepoName: payload.args.internalRepoName, url: payload.args.internalUrl }
    const { project, organization, environments } = payload.args

    for (const env of environments) {
      const appProjectName = generateAppProjectName(organization, project, env)
      const applicationName = generateApplicationName(organization, project, env, repo.internalRepoName)
      const appProject = await addRepoToApplicationProject({ appProjectName, repoUrl: repo.url }) as AppProject & { metadata: { name: string }}
      // @ts-ignore
      const destination: ArgoDestination = appProject.spec.destinations[0]
      if (payload.args.isInfra) {
        await createApplication({ applicationName, destination, appProject, repo })
      }
    }
    return {
      status: {
        result: 'OK',
        message: 'Created',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteRepo: StepCall<DeleteRepositoryExecArgs> = async (payload) => {
  if (!payload.args.isInfra) return nothingStatus

  try {
    const { project, organization, environments, internalRepoName, internalUrl } = payload.args

    for (const env of environments) {
      const applicationName = generateApplicationName(organization, project, env, internalRepoName)
      await deleteApplication({ applicationName, repoUrl: internalUrl })
    }
    return {
      status: {
        result: 'OK',
        message: 'Deleted',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}
