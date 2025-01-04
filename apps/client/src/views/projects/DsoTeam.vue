<script lang="ts" setup>
import { getRandomId } from '@gouvminint/vue-dsfr'
import type { ProjectV2 } from '@cpn-console/shared'
import { ProjectAuthorized } from '@cpn-console/shared'
import { useProjectStore } from '@/stores/project.js'
import { useUserStore } from '@/stores/user.js'
import router from '@/router/index.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const userStore = useUserStore()
const project = computed(() => projectStore.projectsById[props.projectId])

const teamKey = ref('team')

async function addUserToProject(userEmail: string) {
  await project.value.Members.create(userEmail)
  teamKey.value = getRandomId('team')
}

async function removeUserFromProject(userId: string) {
  await project.value.Members.delete(userId)
  teamKey.value = getRandomId('team')
  if (userId === userStore.userProfile?.id) {
    router.push({ name: 'Projects' })
    projectStore.lastSelectedProjectId = undefined
  }
}

async function transferOwnerShip(nextOwnerId: string) {
  await project.value.Commands.update({ ownerId: nextOwnerId })
  teamKey.value = getRandomId('team')
}
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  />
  <TeamCt
    :key="teamKey"
    :project="project"
    :can-manage="ProjectAuthorized.ManageMembers({ projectPermissions: project.myPerms })"
    :can-transfer="project.ownerId === userStore.userProfile?.id"
    @add-member="(userEmail: string) => addUserToProject(userEmail)"
    @remove-member="(userId: string) => removeUserFromProject(userId)"
    @transfer-ownership="(nextOwnerId: string) => transferOwnerShip(nextOwnerId)"
  />
</template>
