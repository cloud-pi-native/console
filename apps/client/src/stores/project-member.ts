import type { projectMemberContract } from '@cpn-console/shared'
import { apiClient, extractData } from '@/api/xhr-client.js'
import { defineStore } from 'pinia'

export const useProjectMemberStore = defineStore('project-member', () => {
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
    getMatchingUsers,
    addMember,
    removeMember,
    patchMembers,
  }
})
