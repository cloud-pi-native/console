<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project.js'

const router = useRouter()
const projectStore = useProjectStore()

const projectList = ref([])
const selectedProject = ref(projectStore.selectedProject?.id)

const setProjectList = () => {
  projectList.value = []
  if (!projectStore.projects.length) return
  projectStore.projects.forEach(project => {
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

watch(selectedProject, () => {
  projectStore.setSelectedProject(selectedProject.value)
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
      v-model="selectedProject"
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
