<script setup>
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project.js'
const router = useRouter()
const projectStore = useProjectStore()

const projectList = ref([])

const projects = computed(() => projectStore.projects)
const selectedProjectId = ref(projectStore.selectedProject?.id)

const setProjectList = () => {
  projectList.value = []
  if (!projects.value.length) return
  projects.value.forEach(project => {
    projectList.value.push({
      text: project.projectName,
      value: project.id,
    })
  })
}

const goToOrderProject = () => {
  router.push('/order-project')
}

onMounted(() => {
  projectStore.getProjects()
})

watch(selectedProjectId, () => {
  projectStore.setSelectedProject(selectedProjectId.value)
})

watch(projects, () => {
  setProjectList()
})

watch(projectStore.projects, () => {
  setProjectList()
})

</script>

<template>
  <div
    class="flex <md:flex-col-reverse items-center justify-between"
  >
    <DsfrSelect
      v-model="selectedProjectId"
      data-testid="projectSelector"
      label="Projet à visualiser"
      :options="projectList"
    />
    <DsfrButton
      label="Créer un nouveau projet"
      data-testid="orderProjectLink"
      tertiary
      class="fr-mt-2v <md:mb-2"
      icon="ri-add-line"
      @click="goToOrderProject()"
    />
  </div>
  <router-view />
</template>
