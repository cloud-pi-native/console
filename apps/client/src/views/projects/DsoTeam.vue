<script lang="ts" setup>
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { ProjectAuthorized } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectMemberStore = useProjectMemberStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()

const teamKey = ref('team')

async function addUserToProject(userEmail: string) {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectMemberStore.addMember(projectStore.selectedProject.id, userEmail)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function removeUserFromProject(userId: string) {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  projectStore.selectedProject.members = await projectMemberStore.removeMember(projectStore.selectedProject.id, userId)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function transferOwnerShip(nextOwnerId: string) {
  if (!projectStore.selectedProject) return
  snackbarStore.isWaitingForResponse = true
  await projectStore.updateProject(projectStore.selectedProject.id, { ownerId: nextOwnerId })
  await projectStore.listProjects()
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
    :members="projectStore.selectedProject.members ?? []"
    :can-manage="ProjectAuthorized.ManageMembers({ projectPermissions: projectStore.selectedProjectPerms })"
    :can-transfer="projectStore.selectedProject.ownerId === userStore.userProfile?.id"
    @add-member="(userEmail: string) => addUserToProject(userEmail)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
    @transfer-ownership="(nextOwnerId: string) => transferOwnerShip(nextOwnerId)"
  />
  <ErrorGoBackToProjects
    v-else
  />
</template>
@/stores/project-member.js
