<script lang="ts" setup>
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useUserStore } from '@/stores/user.js'
import { useUsersStore } from '@/stores/users.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()

const teamKey = ref('team')

const addUserToProject = async (email: string) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectUserStore.addUserToProject(projectStore.selectedProject.id, { email })
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const updateUserRole = async (userId: string) => {
  if (!projectStore.selectedProject) return snackbarStore.setMessage('Veuillez sélectionner un projet')
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectUserStore.transferProjectOwnership(projectStore.selectedProject.id, userId)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const removeUserFromProject = async (userId: string) => {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectUserStore.removeUserFromProject(projectStore.selectedProject?.id, userId)
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
    :project="{id: projectStore.selectedProject.id ?? '', name: projectStore.selectedProject.name ?? '', locked: projectStore.selectedProject.locked ?? false }"
    :known-users="usersStore.users"
    :members="projectStore.selectedProject.members ?? []"
    @add-member="(email: string) => addUserToProject(email)"
    @update-role="(userId: string) => updateUserRole(userId)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
  />
  <ErrorGoBackToProjects
    v-else
  />
</template>
