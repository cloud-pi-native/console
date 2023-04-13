import { createApplicationProject, deleteApplicationProject } from './app-project.js'
import { createApplication, deleteApplication } from './applications.js'
import { createRepoSecret, deleteRepoSecret } from './repo-secret.js'

export const newEnv = async (payload) => {
  try {
    const { project, organization, environment, repositories } = payload.args
    const { roGroup, rwGroup } = payload.keycloak
    const namespace = `${organization}-${project}-${environment}`

    for (const repo of repositories) {
      const appProjectName = `${organization}-${project}-${repo.internalRepoName}-${environment}-project`
      await createApplicationProject({ appProjectName, namespace, repo, roGroup, rwGroup })

      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${environment}`
      await createApplication({ applicationName, appProjectName, namespace, repo, roGroup, rwGroup })
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

export const deleteEnv = async (payload) => {
  try {
    const { project, organization, environment, repositories } = payload.args

    for (const repo of repositories) {
      const appProjectName = `${organization}-${project}-${repo.internalRepoName}-${environment}-project`
      await deleteApplicationProject(appProjectName)

      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${environment}`
      await deleteApplication(applicationName)
    }
    return {
      status: {
        result: 'OK',
      },
    }
  } catch (error) {
    return {
      status: {
        result: 'OK',
        message: 'Failed',
      },
      error: JSON.stringify(error),
    }
  }
}

const nothingStatus = {
  status: {
    result: 'OK',
    message: 'Not an infra repository',
  },
}
export const newRepo = async (payload) => {
  try {
    if (!payload.args.isInfra) return nothingStatus

    const repo = { internalRepoName: payload.args.internalRepoName, url: payload.args.internalUrl }
    const { project, organization, environment } = payload.args
    await createRepoSecret({ project, organization, repo })

    for (const env of environment) {
      const roGroup = `/${organization}-${project}/${env}/RO`
      const rwGroup = `/${organization}-${project}/${env}/RW`
      const namespace = `${organization}-${project}-${env}`
      const appProjectName = `${organization}-${project}-${repo.internalRepoName}-${env}-project`
      await createApplicationProject({ namespace, roGroup, rwGroup, repo, appProjectName })
      const applicationName = `${organization}-${project}-${repo.internalRepoName}-${environment}`
      await createApplication({ applicationName, appProjectName, namespace, repo, roGroup, rwGroup })
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

export const deleteRepo = async (payload) => {
  if (!payload.args.isInfra) return nothingStatus

  try {
    const { project, organization, environments, internalRepoName } = payload.args
    const secretName = `${organization}-${project}-${internalRepoName}-repo`
    await deleteRepoSecret(secretName)

    for (const env of environments) {
      const appProjectName = `${organization}-${project}-${internalRepoName}-${env}-project`
      const applicationName = `${organization}-${project}-${internalRepoName}-${env}`
      await deleteApplicationProject(appProjectName)
      await deleteApplication(applicationName)
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
