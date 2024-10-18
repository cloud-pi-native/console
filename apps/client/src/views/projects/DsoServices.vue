<script lang="ts" setup>
import { type PluginsUpdateBody, ProjectAuthorized, type ProjectService, type ProjectV2 } from '@cpn-console/shared'
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{ projectId: ProjectV2['id'] }>()

const projectStore = useProjectStore()
const snackbarStore = useSnackbarStore()
const project = computed(() => projectStore.projectsById[props.projectId])

const services = ref<ProjectService[]>([])
async function reload() {
  const resServices = await project.value.Services.list()
  services.value = []
  await nextTick()
  services.value = resServices
}

async function save(data: PluginsUpdateBody) {
  snackbarStore.isWaitingForResponse = true
  try {
    await project.value.Services.update(data)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (_error) {
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reload()
  snackbarStore.isWaitingForResponse = false
}

watch(project, reload, { immediate: true })
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  />
  <ServicesConfig
    :services="services"
    permission-target="user"
    display-global
    :disabled="project.locked || !ProjectAuthorized.Manage({ projectPermissions: project.myPerms })"
    @update="(data: PluginsUpdateBody) => save(data)"
    @reload="() => reload()"
  />
</template>
