<script lang="ts" setup>
import type { PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import { computed, ref } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectServiceStore } from '@/stores/project-services.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectServiceStore = useProjectServiceStore()
const project = computed(() => projectStore.selectedProject)
const snackbarStore = useSnackbarStore()

const services = ref<ProjectService[]>([])
async function reload() {
  if (!project.value) return
  const resServices = await projectServiceStore.getProjectServices(project.value.id)
  services.value = []
  await nextTick()
  const filteredServices = resServices
  services.value = filteredServices
}

async function save(data: PluginsUpdateBody) {
  if (!project.value) return

  snackbarStore.isWaitingForResponse = true
  try {
    await projectServiceStore.updateProjectServices(data, project.value.id)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (_error) {
    snackbarStore.setMessage('Erreur lors de la sauvegarde', 'error')
  }
  await reload()
  snackbarStore.isWaitingForResponse = false
}

onBeforeMount(() => {
  reload()
})
</script>

<template>
  <DsoSelectedProject />
  <ServicesConfig
    :services="services"
    permission-target="user"
    display-global
    @update="(data: PluginsUpdateBody) => save(data)"
    @reload="() => reload()"
  />
</template>
