<script lang="ts" setup>
import { ProjectAuthorized } from '@cpn-console/shared'
import { useUserStore } from '@/stores/user.js'
import type { Project } from '@/utils/project-utils.js'

withDefaults(defineProps<{
  project: Project
  hideReplay?: boolean
  hideLock?: boolean
  hideSecrets?: boolean
  hideArchive?: boolean
}>(), {
  hideReplay: false,
  hideLock: false,
  hideSecrets: false,
  hideArchive: false,
})

defineEmits<{
  archive: [Project['id']]
}>()

const userStore = useUserStore()
</script>

<template>
  <div
    class="flex gap-5 flex-wrap"
  >
    <ProjectReplayButton
      v-if="!hideReplay"
      :project="project"
    />
    <ProjectLockButton
      v-if="!hideLock"
      :project="project"
    />
    <ProjectSecretsButton
      v-if="!hideSecrets && ProjectAuthorized.SeeSecrets({ projectPermissions: project.myPerms })"
      :project="project"
    />
    <div
      class="grow"
    />
    <ProjectArchiveButton
      v-if="!hideArchive && ProjectAuthorized.Manage({ adminPermissions: userStore.adminPerms, projectPermissions: project.myPerms })"
      :project="project"
      @archive="$emit('archive', project.id)"
    />
  </div>
</template>
