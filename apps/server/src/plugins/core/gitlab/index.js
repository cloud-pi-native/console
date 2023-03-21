import { gitlabToken, gitlabUrl } from '../../utils/env.js'
import { destroyVault, writeVault } from '../vault/index.js'
import { api, getGroupRootId } from './init.js'

export const gitlabFetch = async ({ method, path, body, codes }) => {
  const options = {
    headers: {
      Accept: 'application/json',
      'PRIVATE-TOKEN': gitlabToken,
    },
    method,
  }
  if (body) {
    options.body = JSON.stringify(body)
    options.headers['Content-Type'] = 'application/json'
  }
  const url = `${gitlabUrl}${path}`
  const res = await fetch(url, {
    ...options,
  })
  if (!codes.includes(res.status)) {
    console.log(res.status)
    console.log(path)
    throw Error((await res.json()).message)
  }
  return res
}

export const initGitlab = async (organizations) => {
  return await Promise.all(organizations.map(org => createGitlabOrganization(org)))
}

export const createGitlabOrganization = async (organization) => {
  const rootId = await getGroupRootId()
  if (!Number.isInteger(rootId)) {
    throw Error('Impossible de trouver le projet racine')
  }
  try {
    const res = await gitlabFetch({
      method: 'POST',
      path: '/api/v4/groups/',
      body: {
        name: organization,
        path: organization,
        parent_id: await getGroupRootId(),
      },
      codes: [201, 400],
    })
    return res
  } catch (error) {
    console.log(error)
    if (error.message.includes('has already been taken')) {
      return true
    }
  }
}

export const createGitlabGroup = async (organization, name) => {
  try {
    const organizationGroup = (await api.Groups.search(organization)).find(group => group.full_path === `forge-mi/projects/${organization}`)
    if (!organizationGroup) {
      throw Error(`${organization} organization does not exist in Gitlab`, { cause: 'organization missing' })
    }

    let projectGroup = (await api.Groups.search(name)).find(group => group.name === name && group.parent_id === organizationGroup.id)
    if (!projectGroup) {
      const res = await gitlabFetch({
        method: 'POST',
        path: '/api/v4/groups/',
        body: {
          name,
          path: name,
          parent_id: organizationGroup.id,
        },
        codes: [201],
      })
      projectGroup = await res.json()
    }
    const editedGroup = await api.Groups.edit(projectGroup.id, {
      subgroup_creation_level: 'owner',
      // TODO vérifier si c'est une bonne bonne idée de d'empecher les users de créer des projets
      project_creation_level: 'noone',
    })
    writeVault(`forge-mi/projects/${organization}/${name}/GITLAB`, {
      ORGANIZATION_NAME: organization,
      PROJECT_NAME: name,
    })
    return editedGroup
  } catch (error) {
    console.log(error)
    if (error.cause === 'organization missing') {
      throw error
    }
  }
}

export const deleteGitlabGroup = async (organization, name) => {
  try {
    const organizationGroup = (await api.Groups.search(organization)).find(group => group.full_path === 'forge-mi/projects/dinum')
    if (!organizationGroup) {
      throw Error(`${organization} organization does not exist in Gitlab`, { cause: 'organization missing' })
    }
    const projectGroup = (await api.Groups.search(name)).find(group => group.name === name && group.parent_id === organizationGroup.id)
    if (projectGroup) {
      await api.Groups.remove(projectGroup.id)
    }
    destroyVault(`forge-mi/projects/${organization}/${name}/GITLAB`)
  } catch (error) {
    console.log(error)
    if (error.cause === 'organization missing') {
      throw error
    }
  }
}

export const createGitlabProject = async ({ name, organization, project }) => {
  console.log(project)
  const organizationGroup = (await api.Groups.search(project)).find(group => group.full_path === `forge-mi/projects/${organization}/${project}`)
  console.log(organizationGroup)
  if (!organizationGroup) {
    throw Error(`${organization} organization does not exist in Gitlab`, { cause: 'organization missing' })
  }
  console.log('preaction repo')
  api.Projects.create({
    name,
    path_with_namespace: organizationGroup.full_path + '/' + name,
    initialize_with_readme: true,
    packages_enabled: false,
  })
}
