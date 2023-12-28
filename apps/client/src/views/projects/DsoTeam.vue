<script lang="ts" setup>
import { ref, computed } from 'vue'
import DsoSelectedProject from './DsoSelectedProject.vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectUserStore } from '@/stores/project-user.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import TeamCt from '@/components/TeamCt.vue'
import { getRandomId } from '@gouvminint/vue-dsfr'
import { handleError } from '@/utils/func.js'
import { useUsersStore } from '@/stores/users.js'

const projectStore = useProjectStore()
const projectUserStore = useProjectUserStore()
const userStore = useUserStore()
const usersStore = useUsersStore()
const snackbarStore = useSnackbarStore()

const project = computed(() => projectStore.selectedProject)
const isUpdatingProjectMembers = ref(false)
const teamCtKey = ref(getRandomId('team'))

const addUserToProject = async (email: string) => {
  isUpdatingProjectMembers.value = true
  try {
    await projectUserStore.addUserToProject(project.value?.id, { email })
  } catch (error) {
    handleError(error)
  }
  teamCtKey.value = getRandomId('team')
  isUpdatingProjectMembers.value = false
}

const updateUserRole = ({ userId, role }: { userId: string, role: string }) => {
  console.log({ userId, role })
  snackbarStore.setMessage('Cette fonctionnalité n\'est pas encore disponible')
}

const removeUserFromProject = async (userId: string) => {
  isUpdatingProjectMembers.value = true
  try {
    await projectUserStore.removeUserFromProject(project.value?.id, userId)
  } catch (error) {
    handleError(error)
  }
  teamCtKey.value = getRandomId('team')
  isUpdatingProjectMembers.value = false
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
    :is-updating-project-members="isUpdatingProjectMembers"
    @add-member="(email) => addUserToProject(email)"
    @update-role="({ userId, role}) => updateUserRole({ userId, role})"
    @remove-member="(userId) => removeUserFromProject(userId)"
  />
</template>
