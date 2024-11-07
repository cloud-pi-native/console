import axios from 'axios'
import type { Project, ProjectLite, StepCall } from '@cpn-console/hooks'
import { generateRandomPassword, parseError } from '@cpn-console/hooks'
import { getAxiosOptions } from './functions.js'
import { createMavenRepo, deleteMavenRepo, getMavenUrls } from './maven.js'
import { createNpmRepo, deleteNpmRepo, getNpmUrls } from './npm.js'
import type { WritePolicy } from './utils.js'
import { deleteIfExists, getTechUsed, parseProjectOptions, updateStore } from './utils.js'

const getAxiosInstance = () => axios.create(getAxiosOptions())

export const deleteNexusProject: StepCall<Project> = async ({ args: project }) => {
  const axiosInstance = getAxiosInstance()
  const projectName = `${project.organization.name}-${project.name}`
  try {
    await Promise.all([
      ...deleteMavenRepo(axiosInstance, projectName),
      ...deleteNpmRepo(axiosInstance, projectName),
      // delete role
      deleteIfExists(`/security/roles/${projectName}-ID`, axiosInstance),
      // delete user
      axiosInstance({
        method: 'delete',
        url: `/security/users/${projectName}`,
        validateStatus: code => code === 404 || code < 300,
      }),
    ])

    return {
      status: {
        result: 'OK',
        message: 'Project deleted from Nexus',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: 'An unexpected error occured',
      },
    }
  }
}

export const createNexusProject: StepCall<Project> = async (payload) => {
  try {
    if (!payload.apis.vault) throw new Error('no Vault available')

    const axiosInstance = getAxiosInstance()
    const organization = payload.args.organization.name
    const project = payload.args.name
    const projectName = `${organization}-${project}`
    const owner = payload.args.owner
    const res: any = {}
    const options = parseProjectOptions(payload.args.store.nexus)
    const failedProvisionning: Partial<Record<keyof typeof techUsed, { error: Error | unknown, message: string }>> = {}
    const techUsed = getTechUsed(payload)

    if (options.keysInError.length) {
      return {
        status: {
          result: 'WARNING',
          message: `${options.keysInError.join(', ')} ${options.keysInError.length > 1 ? 'are' : 'is'} invalid, provisionning canceled, fix it and try again`,
        },
        warnReasons: [`invalid key(s): ${options.keysInError.join(', ')}`],
      }
    }
    const privilegesToAccess = [] as string[]

    try {
      if (techUsed.maven) {
        const names = await createMavenRepo(axiosInstance, projectName, {
          releaseWritePolicy: options.mavenReleaseWritePolicy as WritePolicy,
          snapshotWritePolicy: options.mavenSnapshotWritePolicy as WritePolicy,
        })
        privilegesToAccess.push(names.group.privilege, ...names.hosted.map(({ privilege }) => privilege))
      } else {
        await Promise.all(deleteMavenRepo(axiosInstance, projectName))
      }
    } catch (error) {
      failedProvisionning.maven = { error, message: `Maven failed to ${techUsed.maven ? 'provision' : 'delete'} repositories please try again in few minutes` }
    }

    try {
      if (techUsed.npm) {
        const names = await createNpmRepo(axiosInstance, projectName, options.npmWritePolicy as WritePolicy)
        privilegesToAccess.push(names.group.privilege, ...names.hosted.map(({ privilege }) => privilege))
      } else {
        await Promise.all(deleteNpmRepo(axiosInstance, projectName))
      }
    } catch (error) {
      failedProvisionning.npm = { error, message: `Npm failed to ${techUsed.npm ? 'provision' : 'delete'} repositories please try again in few minutes` }
    }

    const roleId = `${projectName}-ID`
    // create role
    const role = await axiosInstance({
      method: 'GET',
      url: `security/roles/${roleId}`,
      validateStatus: code => [200, 404].includes(code),
    })
    if (role.status === 404) {
      await axiosInstance({
        method: 'post',
        url: '/security/roles',
        data: {
          id: `${projectName}-ID`,
          name: `${projectName}-role`,
          description: 'desc',
          privileges: privilegesToAccess,
        },
        validateStatus: code => [200].includes(code),
      })
    } else if (role.status === 200) {
      await axiosInstance({
        method: 'PUT',
        url: `security/roles/${roleId}`,
        data: {
          id: `${projectName}-ID`,
          name: `${projectName}-role`,
          privileges: privilegesToAccess,
        },
        validateStatus: code => [204].includes(code),
      })
    }

    const vaultNexusSecret = await payload.apis.vault.read('NEXUS', { throwIfNoEntry: false })
    let currentPwd: string = vaultNexusSecret?.NEXUS_PASSWORD

    const newPwd = generateRandomPassword(30)
    const getUser = await axiosInstance({
      url: `/security/users?userId=${projectName}`,
    }) as { data: { userId: string }[] }
    const user = getUser.data.find(user => user.userId === projectName)
    if (user) {
      res.user = getUser.data[0]
      res.status = { result: 'OK', message: 'User already exists' }
      if (!vaultNexusSecret) {
        await axiosInstance({
          method: 'put',
          url: `/security/users/${projectName}/change-password`,
          data: newPwd,
          headers: {
            'Content-Type': 'text/plain',
          },
        })
        currentPwd = newPwd
      }
    } else {
    // createUser
      await axiosInstance({
        method: 'post',
        url: '/security/users',
        data: {
          userId: projectName,
          firstName: 'Monkey D.',
          lastName: 'Luffy',
          emailAddress: owner.email,
          password: newPwd,
          status: 'active',
          roles: [`${projectName}-ID`],
        },
      })
      currentPwd = newPwd
    }

    if (!getUser.data.length || (getUser.data.length && !vaultNexusSecret)) { // conditions précédentes, si non existent ou si modp a dû être changé
      await payload.apis.vault.write({
        NEXUS_PASSWORD: currentPwd,
        NEXUS_USERNAME: projectName,
      }, 'NEXUS')
    }

    if (Object.keys(failedProvisionning).length) {
      const failed = Object.values(failedProvisionning)
      return {
        status: {
          result: 'WARNING',
          message: failed.map(({ message }) => message).join('; '),
        },
        errors: failed.map(({ error }) => parseError(error)),
      }
    }

    return {
      status: {
        result: 'OK',
        message: 'Up-to-date',
      },
      store: updateStore(payload.args.store.nexus),
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        message: 'Fail Create repositories',
      },
    }
  }
}

export const getSecrets: StepCall<ProjectLite> = async (payload) => {
  const projectName = `${payload.args.organization.name}-${payload.args.name}`
  const techUsed = getTechUsed(payload)

  return {
    status: {
      result: 'OK',
    },
    secrets: {
      ...techUsed.maven && getMavenUrls(projectName),
      ...techUsed.npm && getNpmUrls(projectName),
    },
  }
}
