<script lang="ts" setup>
import { type ProjectService } from '@cpn-console/shared'
import { PluginsUpdateBody } from '@cpn-console/shared'
import { ref, computed } from 'vue'
import { useProjectStore } from '@/stores/project.js'
import { useProjectServiceStore } from '@/stores/project-services.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const projectStore = useProjectStore()
const projectServiceStore = useProjectServiceStore()
const project = computed(() => projectStore.selectedProject)
const snackbarStore = useSnackbarStore()

const services = ref<ProjectService[]>([])
const reload = async () => {
  if (!project.value) return
  const resServices = await projectServiceStore.getProjectServices(project.value.id)
  services.value = []
  await nextTick()
  const filteredServices = resServices
  services.value = filteredServices
}

const save = async (data: PluginsUpdateBody) => {
  if (!project.value) return

  snackbarStore.isWaitingForResponse = true
  try {
    await projectServiceStore.updateProjectServices(data, project.value.id)
    snackbarStore.setMessage('Paramètres sauvegardés', 'success')
  } catch (error) {
    console.log(error)

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
    @update="(data: PluginsUpdateBody) => save(data)"
    @reload="() => reload()"
  />
</template>
