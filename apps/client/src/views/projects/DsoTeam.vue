<script lang="ts" setup>
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { useUsersStore } from '@/stores/users.js'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const teamCtKey = ref(getRandomId('team'))

const addUserToProject = async (email: string) => {
  if (!project.value) return
  snackbarStore.isWaitingForResponse = true
  await projectUserStore.addUserToProject(project.value.id, { email })
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const updateUserRole = async (userId: string) => {
  if (!project.value) return snackbarStore.setMessage('Veuillez sélectionner un projet')
  snackbarStore.isWaitingForResponse = true
  await projectUserStore.transferProjectOwnership(project.value.id, userId)
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const removeUserFromProject = async (userId: string) => {
  if (!project.value) return
  snackbarStore.isWaitingForResponse = true
  await projectUserStore.removeUserFromProject(project.value?.id, userId)
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

</script>

<template>
  <DsoSelectedProject />

  <TeamCt
    v-if="project"
    :key="teamCtKey"
    :user-profile="userStore.userProfile"
    :project="{id: project.id ?? '', name: project.name ?? '', locked: project.locked ?? false }"
    :known-users="usersStore.users"
    :members="project.roles ?? []"
    @add-member="(email: string) => addUserToProject(email)"
    @update-role="(userId: string) => updateUserRole(userId)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
  />
  <ErrorGoBackToProjects
    v-else
  />
</template>
