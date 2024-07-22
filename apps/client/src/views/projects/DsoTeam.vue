<script lang="ts" setup>
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useUserStore } from '@/stores/user.js'
import { useUsersStore } from '@/stores/users.js'
import { ProjectAuthorized } from '@cpn-console/shared'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()

const teamKey = ref('team')

const addUserToProject = async (userEmail: string) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectUserStore.addMember(projectStore.selectedProject.id, userEmail)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const removeUserFromProject = async (userId: string) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectUserStore.removeMember(projectStore.selectedProject.id, userId)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}
</script>

<template>
  <DsoSelectedProject />
  <TeamCt
    v-if="projectStore.selectedProject"
    :key="teamKey"
    :user-profile="userStore.userProfile"
    :project="projectStore.selectedProject"
    :known-users="usersStore.users"
    :members="projectStore.selectedProject.members ?? []"
    :can-manage="ProjectAuthorized.ManageMembers({ projectPermissions: projectStore.selectedProjectPerms})"
    @add-member="(userEmail: string) => addUserToProject(userEmail)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
  />
  <ErrorGoBackToProjects
    v-else
  />
</template>
