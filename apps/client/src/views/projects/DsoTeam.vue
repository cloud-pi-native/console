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
  snackbarStore.isWaitingForResponse = true
  await projectUserStore.addUserToProject(project.value?.id, { email })
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

const updateUserRole = ({ userId, role }: { userId: string, role: string }) => {
  console.log({ userId, role })
  snackbarStore.setMessage('Cette fonctionnalité n\'est pas encore disponible')
}

const removeUserFromProject = async (userId: string) => {
  snackbarStore.isWaitingForResponse = true
  await projectUserStore.removeUserFromProject(project.value?.id, userId)
  teamCtKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

</script>

<template>
  <DsoSelectedProject />

  <TeamCt
    :key="teamCtKey"
    :user-profile="userStore.userProfile"
    :project="{id: project?.id, name: project?.name }"
    :known-users="usersStore.users"
    :roles="project.roles"
    @add-member="(email) => addUserToProject(email)"
    @update-role="({ userId, role}) => updateUserRole({ userId, role})"
    @remove-member="(userId) => removeUserFromProject(userId)"
  />
</template>
