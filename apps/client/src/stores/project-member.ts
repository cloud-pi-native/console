import { defineStore } from 'pinia'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { projectMemberContract } from '@cpn-console/shared'

export const useProjectMemberStore = defineStore('project-member', () => {
  const getAllUsers = () =>
    apiClient.Users.getAllUsers()
      .then(response => extractData(response, 200))

  const getMatchingUsers = async (projectId: string, letters: string) =>
    apiClient.Users.getMatchingUsers({ query: { letters, notInProjectId: projectId } })
    .then(response => extractData(response, 200))

  const addMember = async (projectId: string, email: string) =>
    apiClient.ProjectsMembers.addMember({ params: { projectId }, body: { email } })
      .then(response => extractData(response, 201))

  const removeMember = async (projectId: string, userId: string) =>
    apiClient.ProjectsMembers.removeMember({ params: { projectId, userId } })
      .then(response => extractData(response, 200))

  const patchMembers = async (projectId: string, body: typeof projectMemberContract.patchMembers.body._type) =>
    apiClient.ProjectsMembers.patchMembers({ params: { projectId }, body })
      .then(response => extractData(response, 200))

  return {
    getAllUsers,
    getMatchingUsers,
    addMember,
    removeMember,
    patchMembers,
  }
})
