import type { Project, StepCall } from '@cpn-console/hooks'
import type { AxiosInstance } from 'axios'
import { generateRandomPassword, parseError } from '@cpn-console/hooks'
import axios from 'axios'
import { getAxiosOptions } from './functions.js'

const getAxiosInstance = () => axios.create(getAxiosOptions())

export const createNexusProject: StepCall<Project> = async (payload) => {
  const axiosInstance = getAxiosInstance()
  try {
    const organization = payload.args.organization.name
    const project = payload.args.name
    const owner = payload.args.owner
    const projectName = `${organization}-${project}`
    const res: any = {}

    // @ts-ignore to delete when in own plugin
    if (!payload.apis.vault) throw new Error('no Vault available')
    // create local repo maven
    for (const repVersion of ['release', 'snapshot']) {
      await axiosInstance({
        method: 'post',
        url: '/repositories/maven/hosted',
        data: {
          name: `${projectName}-repository-${repVersion}`,
          online: true,
          storage: {
            blobStoreName: 'default',
            strictContentTypeValidation: true,
            writePolicy: 'allow_once',
          },
          cleanup: { policyNames: ['string'] },
          component: { proprietaryComponents: true },
          maven: {
            versionPolicy: 'MIXED',
            layoutPolicy: 'STRICT',
            contentDisposition: 'ATTACHMENT',
          },
        },
        validateStatus: code => [201, 400].includes(code),
      })
    }
    // create maven group
    await axiosInstance({
      method: 'post',
      url: '/repositories/maven/group',
      data: {
        name: `${projectName}-repository-group`,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true,
        },
        group: {
          memberNames: [
            `${projectName}-repository-snapshot`,
            `${projectName}-repository-release`,
            'maven-public',
          ],
        },
      },
      validateStatus: code => [201, 400].includes(code),
    })
    // create privileges
    for (const privilege of ['snapshot', 'release', 'group']) {
      await axiosInstance({
        method: 'post',
        url: '/security/privileges/repository-view',
        data: {
          name: `${projectName}-privilege-${privilege}`,
          description: `Privilege for organization ${projectName} for repo ${privilege}`,
          actions: ['all'],
          format: 'maven2',
          repository: `${projectName}-repository-${privilege}`,
        },
        validateStatus: code => [201, 400].includes(code),
      })
    }
    // create role
    await axiosInstance({
      method: 'post',
      url: '/security/roles',
      data: {
        id: `${projectName}-ID`,
        name: `${projectName}-role`,
        description: 'desc',
        privileges: [
          `${projectName}-privilege-snapshot`,
          `${projectName}-privilege-release`,
          `${projectName}-privilege-group`,
        ],
      },
      validateStatus: code => [200, 400].includes(code),
    })

    const vaultNexusSecret = await payload.apis.vault.read('NEXUS', { throwIfNoEntry: false })
    let currentPwd: string = vaultNexusSecret?.NEXUS_PASSWORD

    const newPwd = generateRandomPassword(30)
    const getUser = await axiosInstance({
      url: `/security/users?userId=${projectName}`,
    }) as { data: { userId: string }[] }
    const user = getUser.data.find(user => user.userId === projectName)
    if (user) {
      res.user = getUser.data[0]
      res.status = { result: 'OK', message: 'User already exist' }
      if (!vaultNexusSecret) {
        await axiosInstance({
          method: 'put',
          url: `/security/users/${projectName}/change-password`,
          data: newPwd,
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
    // await payload.apis.gitlab.setGitlabGroupVariable({
    //   key: 'NEXUS_USERNAME',
    //   masked: false,
    //   protected: false,
    //   variable_type: 'env_var',
    //   value: projectName,
    // })
    // await payload.apis.gitlab.setGitlabGroupVariable({
    //   key: 'NEXUS_PASSWORD',
    //   masked: true,
    //   protected: false,
    //   variable_type: 'env_var',
    //   value: currentPwd,
    // })

    return {
      status: { result: 'OK', message: 'Up-to-date' },
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

export const deleteNexusProject: StepCall<Project> = async ({ args: project }) => {
  const axiosInstance = getAxiosInstance()
  const projectName = `${project.organization.name}-${project.name}`
  try {
    await Promise.all([
      // delete local repo maven snapshot
      await deleteIfExists(`/repositories/${projectName}-repository-release`, axiosInstance),
      await deleteIfExists(`/repositories/${projectName}-repository-snapshot`, axiosInstance),
      await deleteIfExists(`/repositories/${projectName}-repository-group`, axiosInstance),
      // delete privileges
      await deleteIfExists(`/security/privileges/${projectName}-privilege-snapshot`, axiosInstance),
      await deleteIfExists(`/security/privileges/${projectName}-privilege-release`, axiosInstance),
      await deleteIfExists(`/security/privileges/${projectName}-privilege-group`, axiosInstance),
      // delete role
      await deleteIfExists(`/security/roles/${projectName}-ID`, axiosInstance),
      // delete user
      await axiosInstance({
        method: 'delete',
        url: `/security/users/${projectName}`,
        validateStatus: code => code === 404 || code < 300,
      }),
    ])

    return {
      status: {
        result: 'OK',
        message: 'User deleted',
      },
    }
  } catch (error) {
    return {
      error: parseError(error),
      status: {
        result: 'KO',
        // @ts-ignore prévoir une fonction générique
        message: error.message,
      },
    }
  }
}

async function deleteIfExists(url: string, axiosInstance: AxiosInstance) {
  const res = await axiosInstance({
    method: 'get',
    url,
    validateStatus: code => code === 404 || code < 300,
  })
  if (res.status === 404) {
    // delete maven group
    await axiosInstance({
      method: 'delete',
      url,
      validateStatus: code => code === 404 || code < 300,
    })
  }
}
