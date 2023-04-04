import axios from 'axios'
import { axiosOptions } from './index.js'
import { generateRandomPassword } from '../../../utils/crypto.js'

export const createNexusProject = async (payload) => {
  const { organization, name, email } = payload.args
  const projectName = `${organization}-${name}`
  const res = { status: {} }

  try {
  // create local repo maven
    for (const repVersion of ['release', 'snapshot']) {
      await axios({
        ...axiosOptions,
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
        validateStatus: (code) => [201, 400].includes(code),
      })
    }
    // create maven group
    await axios({
      ...axiosOptions,
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
      validateStatus: (code) => [201, 400].includes(code),
    })
    // create privileges
    for (const privilege of ['snapshot', 'release', 'group']) {
      await axios({
        ...axiosOptions,
        method: 'post',
        url: '/security/privileges/repository-view',
        data: {
          name: `${projectName}-privilege-${privilege}`,
          description: `Privilege for organization ${projectName} for repo ${privilege}`,
          actions: ['all'],
          format: 'maven2',
          repository: `${projectName}-repository-${privilege}`,
        },
        validateStatus: (code) => [201, 400].includes(code),
      })
    }
    // create role
    await axios({
      ...axiosOptions,
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
      validateStatus: (code) => [200, 400].includes(code),
    })

    const getUser = await axios({
      ...axiosOptions,
      url: `/security/users?userId=${projectName}`,
    })
    if (getUser.data.length) {
      res.user = getUser.data[0]
      res.status = { result: 'OK', message: 'User already exist' }
      return res
    }

    const newPwd = generateRandomPassword(30)
    // createUser
    const newUser = await axios({
      ...axiosOptions,
      method: 'post',
      url: '/security/users',
      data: {
        userId: `${projectName}`,
        firstName: 'Monkey D.',
        lastName: 'Luffy',
        emailAddress: email,
        password: newPwd,
        status: 'active',
        roles: [`${projectName}-ID`],
      },
    })
    res.vault = [{
      name: 'NEXUS',
      data: {
        NEXUS_PASSWORD: newPwd,
        NEXUS_USERNAME: projectName,
      },
    }]
    res.user = newUser.data
    res.status = { result: 'OK', message: 'User Created' }
    return res
  } catch (error) {
    return {
      status: { result: 'KO', message: 'Fail Create repositories', error },
    }
  }
}

export const deleteNexusProject = async (payload) => {
  const { organization, name } = payload.args
  const projectName = `${organization}-${name}`
  // await axios({
  //   method: 'GET',
  //   url: `/security/users?userId=${projectName}`,
  //   codes: ['200'],
  // })

  try {
    // delete local repo maven snapshot
    for (const repVersion of ['release', 'snapshot']) {
      await axios({
        ...axiosOptions,
        method: 'delete',
        url: `/repositories/${projectName}-repository-${repVersion}`,
        validateStatus: code => code === 404 || code < 300,
      })
    }

    // delete maven group
    await axios({
      ...axiosOptions,
      method: 'delete',
      url: `/repositories/${projectName}-repository-group`,
      validateStatus: code => code === 404 || code < 300,
    })

    // delete privileges
    for (const privilege of ['snapshot', 'release', 'group']) {
      await axios({
        ...axiosOptions,
        method: 'delete',
        url: `/security/privileges/${projectName}-privilege-${privilege}`,
        validateStatus: code => code === 404 || code < 300,
      })
    }

    // delete role
    await axios({
      ...axiosOptions,
      method: 'delete',
      url: `/security/roles/${projectName}-ID`,
      validateStatus: code => code === 404 || code < 300,
    })

    // delete user
    await axios({
      ...axiosOptions,
      method: 'delete',
      url: `/security/users/${projectName}`,
      validateStatus: code => code === 404 || code < 300,
    })

    return {
      status: {
        result: 'OK',
        message: 'User deleted',
      },
      vault: [{
        name: 'NEXUS',
      }],
    }
  } catch (error) {
    return {
      status: {
        result: 'KO',
        message: error.message,
      },
    }
  }
}