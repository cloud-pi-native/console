<script lang="ts" setup>
import type { PluginsUpdateBody, ProjectService } from '@cpn-console/shared'
import { computed, ref } from 'vue'
import type { ProjectComplete } from '@/stores/project.js'
import { useProjectStore } from '@/stores/project.js'
import { useProjectServiceStore } from '@/stores/project-services.js'
import { useSnackbarStore } from '@/stores/snackbar.js'

const props = defineProps<{ projectId: ProjectComplete['id'] }>()

const projectStore = useProjectStore()
const projectServiceStore = useProjectServiceStore()
const snackbarStore = useSnackbarStore()
const project = computed(() => projectStore.myProjectsById[props.projectId])

const services = ref<ProjectService[]>([])
async function reload() {
  const resServices = await projectServiceStore.getProjectServices(project.value.id)
  services.value = []
  await nextTick()
  services.value = resServices
}

async function save(data: PluginsUpdateBody) {
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

watch(project, async () => {
  reload()
})

projectStore.$subscribe(async () => {
  if (!projectStore.selectedProject) return
  reload()
})
</script>

<template>
  <DsoSelectedProject
    :project-id="projectId"
  />
  <ServicesConfig
    :services="services"
    permission-target="user"
    display-global
    @update="(data: PluginsUpdateBody) => save(data)"
    @reload="() => reload()"
  />
</template>
