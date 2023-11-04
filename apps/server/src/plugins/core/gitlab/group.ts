import { ProjectVariableSchema, VariableSchema } from '@gitbeaker/rest'
import { api, getGroupRootId } from './utils.js'

export const getGroupId = async (name: string, organization: string): Promise<void | number> => {
  const parentId = await getOrganizationId(organization)
  const searchResult = await api.Groups.allSubgroups(parentId)
  const existingGroup = searchResult.find(group => group.name === name)
  return existingGroup?.id
}

const getOrganizationId = async (organization: string) => {
  const rootId = await getGroupRootId()
  const orgSearch = await api.Groups.allSubgroups(rootId)
  const org = orgSearch.find(org => org.name === organization)
  if (!org) {
    console.log(`Organization's group ${organization} does not exist on Gitlab, creating one...`) // TODO à attacher au logger de app
    const newOrg = await api.Groups.create(organization, organization, {
      parentId: rootId,
      projectCreationLevel: 'developer',
      subgroupCreationLevel: 'owner',
    })
    return newOrg.id
  }
  return org.id
}

export const createGroup = async (name: string, organization: string) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (existingGroup) {
    return existingGroup
  }

  return api.Groups.create(name, name, {
    parentId,
    projectCreationLevel: 'maintainer',
    subgroupCreationLevel: 'owner',
    defaultBranchProtection: 0,
  })
}

export const getGroupInfos = async (name: string, organization: string) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  return existingGroup
}

export const deleteGroup = async (name: string, organization: string) => {
  const searchResult = await api.Groups.search(name)
  const parentId = await getOrganizationId(organization)
  const existingGroup = searchResult.find(group => group.parent_id === parentId)
  if (!existingGroup) {
    return
  }
  return api.Groups.remove(existingGroup.id)
}

export const setGroupVariable = async (groupId: number, toSetVariable: VariableSchema) => {
  const listVars = await api.GroupVariables.all(groupId)
  const currentVariable = listVars.find(v => v.key === toSetVariable.key)
  if (!currentVariable) {
    await api.GroupVariables.create(
      groupId,
      toSetVariable.key,
      toSetVariable.value,
      {
        variableType: toSetVariable.variable_type,
        masked: toSetVariable.masked,
        protected: toSetVariable.protected,
      })
    return 'created'
  } else {
    if (
      currentVariable.masked !== toSetVariable.masked ||
      currentVariable.value !== toSetVariable.value ||
      currentVariable.protected !== toSetVariable.protected ||
      currentVariable.variable_type !== toSetVariable.variable_type
    ) {
      await api.GroupVariables.edit(
        groupId,
        toSetVariable.key,
        toSetVariable.value,
        {
          variableType: toSetVariable.variable_type,
          masked: toSetVariable.masked,
          protected: toSetVariable.protected,
        })
      return 'updated'
    }
    return 'already up-to-date'
  }
}

export const setProjectVariable = async (projectId: number, toSetVariable: ProjectVariableSchema) => {
  const listVars = await api.ProjectVariables.all(projectId)
  const currentVariable = listVars.find(v => v.key === toSetVariable.key)
  if (!currentVariable) {
    await api.ProjectVariables.create(
      projectId,
      toSetVariable.key,
      toSetVariable.value,
      {
        variableType: toSetVariable.variable_type,
        masked: toSetVariable.masked,
        protected: toSetVariable.protected,
      })
    return 'created'
  } else {
    if (
      currentVariable.masked !== toSetVariable.masked ||
      currentVariable.value !== toSetVariable.value ||
      currentVariable.protected !== toSetVariable.protected ||
      currentVariable.variable_type !== toSetVariable.variable_type
    ) {
      await api.ProjectVariables.edit(
        projectId,
        toSetVariable.key,
        toSetVariable.value,
        {
          variableType: toSetVariable.variable_type,
          masked: toSetVariable.masked,
          protected: toSetVariable.protected,
          filter: {
            environment_scope: toSetVariable.environment_scope,
          },
        })
      return 'updated'
    }
    return 'already up-to-date'
  }
}
