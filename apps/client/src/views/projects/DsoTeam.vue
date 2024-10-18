<script lang="ts" setup>
// @ts-ignore '@gouvminint/vue-dsfr' missing types
import { getRandomId } from '@gouvminint/vue-dsfr'
import { ProjectAuthorized } from '@cpn-console/shared'
import type { ProjectComplete } from '@/stores/project.js'
import { useProjectStore } from '@/stores/project.js'
import { useProjectMemberStore } from '@/stores/project-member.js'
import { useUserStore } from '@/stores/user.js'
import { useSnackbarStore } from '@/stores/snackbar.js'
import router from '@/router/index.js'

const props = defineProps<{ projectId: ProjectComplete['id'] }>()

const projectStore = useProjectStore()
const projectMemberStore = useProjectMemberStore()
const userStore = useUserStore()
const snackbarStore = useSnackbarStore()
const project = computed(() => projectStore.myProjectsById[props.projectId])

const teamKey = ref('team')

async function addUserToProject(userEmail: string) {
  snackbarStore.isWaitingForResponse = true
  project.value.members = await projectMemberStore.addMember(project.value.id, userEmail)
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}

async function removeUserFromProject(userId: string) {
  snackbarStore.isWaitingForResponse = true
  project.value.members = await projectMemberStore.removeMember(project.value.id, userId)
  await projectStore.getMyProjects()
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
  if (userId === userStore.userProfile?.id) {
    router.push('/projects')
  }
}

async function transferOwnerShip(nextOwnerId: string) {
  snackbarStore.isWaitingForResponse = true
  await projectStore.updateProject(project.value.id, { ownerId: nextOwnerId })
  await projectStore.getMyProjects()
  teamKey.value = getRandomId('team')
  snackbarStore.isWaitingForResponse = false
}
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  />
  <TeamCt
    v-if="project"
    :key="teamKey"
    :user-profile="userStore.userProfile"
    :project="project"
    :members="project.members ?? []"
    :can-manage="ProjectAuthorized.ManageMembers({ projectPermissions: project.myPerms })"
    :can-transfer="project.ownerId === userStore.userProfile?.id"
    @add-member="(userEmail: string) => addUserToProject(userEmail)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
    @transfer-ownership="(nextOwnerId: string) => transferOwnerShip(nextOwnerId)"
  />
  <ErrorGoBackToProjects
    v-else
  />
</template>
@/stores/project-member.js
